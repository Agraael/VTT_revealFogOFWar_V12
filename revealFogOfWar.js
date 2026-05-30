const REVEALFOG_MODULE_ID = 'revealFogOfWar';

async function revealAllFogOfWar()
{
    if (!game.user.isGM)
    {
        ui.notifications.warn("Only the GM can reveal the fog of war!");
        return;
    }

    const confirmed = await new Promise((resolve) =>
    {
        new Dialog({
            title: "Reveal Fog of War Exploration?",
            content: "<p>This will reveal this scene's fog of war for all players.</p>",
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Yes",
                    callback: () => resolve(true)
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "No",
                    callback: () => resolve(false)
                }
            },
            default: "yes"
        }).render(true);
    });

    if (!confirmed)
        return;

    const scene = canvas.scene;
    const FogExploration = getDocumentClass("FogExploration");
    // 1x1 transparent-white PNG: smallest payload that the fog renderer treats as "fully explored".
    const EXPLORED = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    for (const user of game.users)
    {
        const explorationData = { scene: scene.id, user: user.id, explored: EXPLORED };
        try
        {
            // v13: prefer .load over the deprecated .get-with-object shim.
            const loader = FogExploration.load ?? FogExploration.get;
            const existing = await loader.call(FogExploration, { scene, user });
            if (existing)
            {
                await existing.delete();
            }
            await FogExploration.create(explorationData, { render: true });
        }
        catch (err)
        {
            console.warn(`revealFogOfWar | failed to upsert for user ${user.name}`, err);
        }
    }

    game.socket.emit(`module.${REVEALFOG_MODULE_ID}`, {
        type: "reloadFog"
    });


    canvas.fog.load();
    canvas.perception.update({ refreshVision: true, refreshLighting: true });

    ui.notifications.info("The fog of war has been revealed for all players!");
}

Hooks.once("ready", () =>
{
    game.socket.on(`module.${REVEALFOG_MODULE_ID}`, (data) =>
    {
        if (data.type === "reloadFog")
        {
            ui.notifications.info("The fog of war has been revealed for all players!");
            canvas.fog.load();
            canvas.perception.update({ refreshVision: true, refreshLighting: true });
        }
    });
});

// Register the scene control hook at top level. The `getSceneControlButtons` hook fires
// during canvas/UI init, which can run BEFORE "ready" -> a hook registered inside ready
// would miss the first emission and the button wouldn't appear until next re-render.
Hooks.on("getSceneControlButtons", (controls) =>
{
    if (!game.user?.isGM)
        return;

    // v13: controls and tools are keyed objects, not arrays.
    const lightingControl = Array.isArray(controls)
        ? controls.find(c => c.name === "lighting")
        : controls?.lighting;
    if (!lightingControl)
        return;

    const tool = {
        name: "reveal-fog",
        title: "Reveal Fog of War",
        icon: "fas fa-eye",
        button: true,
        // v13 prefers onChange; defining both fires twice because v13 calls each in separate `if` blocks.
        onChange: () => revealAllFogOfWar()
    };
    if (Array.isArray(lightingControl.tools))
        lightingControl.tools.push(tool);
    else if (lightingControl.tools)
        lightingControl.tools["reveal-fog"] = tool;
});
