const { withAndroidStyles, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const vector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#1D9BF0" android:pathData="M18,0 L90,0 Q108,0 108,18 L108,90 Q108,108 90,108 L18,108 Q0,108 0,90 L0,18 Q0,0 18,0 Z"/>
    <path android:fillColor="#FFFFFF" android:pathData="M43,30 L22,54 L43,78 L49,72 L33,54 L49,36 Z"/>
    <path android:fillColor="#FFFFFF" android:pathData="M65,30 L86,54 L65,78 L59,72 L75,54 L59,36 Z"/>
    <path android:fillColor="#FFFFFF" android:pathData="M59,24 L49,84 L57,84 L67,24 Z"/>
</vector>`;

module.exports = function withTechCommunitySplash(config) {
  config = withDangerousMod(config, ["android", async (config) => {
    const res = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "res", "drawable");
    fs.mkdirSync(res, { recursive: true });
    fs.writeFileSync(path.join(res, "tech_community_splash.xml"), vector);
    const iconVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#FFFFFFFF" android:pathData="M42,29 L19,54 L42,79 L49,72 L32,54 L49,36 Z"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M66,29 L89,54 L66,79 L59,72 L76,54 L59,36 Z"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M60,22 L48,86 L57,86 L69,22 Z"/>
</vector>`;
    fs.writeFileSync(path.join(res, "tech_community_icon.xml"), iconVector);
    const mipmap = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "res", "mipmap-anydpi-v26");
    fs.mkdirSync(mipmap, { recursive: true });
    const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/tech_community_icon_background"/>
    <foreground android:drawable="@drawable/tech_community_icon"/>
</adaptive-icon>`;
    fs.writeFileSync(path.join(mipmap, "ic_launcher.xml"), adaptive);
    fs.writeFileSync(path.join(mipmap, "ic_launcher_round.xml"), adaptive);
    const values = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "res", "values");
    fs.mkdirSync(values, { recursive: true });
    const colorsPath = path.join(values, "tech_community_icon_colors.xml");
    fs.writeFileSync(colorsPath, `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="tech_community_icon_background">#1D9BF0</color></resources>`);
    return config;
  }]);
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    for (const style of styles.resources.style || []) {
      if (style.$ && style.$.name === "Theme.App.SplashScreen") {
        style.item = (style.item || []).filter((item) => item.$.name !== "windowSplashScreenAnimatedIcon");
        style.item.push({ $: { name: "windowSplashScreenAnimatedIcon" }, _: "@drawable/tech_community_splash" });
        style.item.push({ $: { name: "windowSplashScreenBackground" }, _: "#FFFFFF" });
      }
    }
    return config;
  });
  return config;
};
