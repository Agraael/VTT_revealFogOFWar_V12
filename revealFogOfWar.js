const MODULE_ID = 'revealFogOfWar';

async function revealAllFogOfWar() {
  if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can reveal the fog of war!");
    return;
  }

  const confirmed = await new Promise((resolve) => {
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

  if (!confirmed) return;

  const scene = canvas.scene;
  await scene.update({ fogExploration: false });

  for (const user of game.users) {
    const explorationData = {
      scene: scene.id,
      user: user.id,
      explored: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
    };

    const fogExplorationCls = getDocumentClass("FogExploration");
    let exploration = await fogExplorationCls.get({ scene, user });

    if (exploration) {
      await exploration.update(explorationData, { diff: false, render: true });
    } else {
      exploration = new fogExplorationCls(explorationData);
      await fogExplorationCls.create(exploration.toJSON(), { render: true });
    }
  }

  game.socket.emit(`module.${MODULE_ID}`, {
    type: "reloadFog"
  });


  canvas.fog.load();
  canvas.perception.update({ refreshVision: true, refreshLighting: true });

  ui.notifications.info("The fog of war has been revealed for all players!");
}

Hooks.once("ready", () => {
  game.socket.on(`module.${MODULE_ID}`, (data) => {
    if (data.type === "reloadFog") {
      canvas.fog.load();
      canvas.perception.update({ refreshVision: true, refreshLighting: true });
    }
  });

  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;

    const lightingControl = controls.find(c => c.name === "lighting");
    if (lightingControl) {
      lightingControl.tools.push({
        name: "reveal-fog",
        title: "Reveal Fog of War",
        icon: "fas fa-eye",
        button: true,
        onClick: () => revealAllFogOfWar()
      });
    }
  });
});
