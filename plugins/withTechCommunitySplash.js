const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withTechCommunityIcon(config) {
  return withDangerousMod(config, ["android", async (config) => {
    const root = path.join(
      config.modRequest.platformProjectRoot,
      "app", "src", "main", "res"
    );

    const drawable = path.join(root, "drawable");
    const mipmap = path.join(root, "mipmap-anydpi-v26");
    const values = path.join(root, "values");

    fs.mkdirSync(drawable, { recursive: true });
    fs.mkdirSync(mipmap, { recursive: true });
    fs.mkdirSync(values, { recursive: true });

    // Adaptive launcher icon foreground: white technology/community mark.
    const foreground = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M42,29 L19,54 L42,79 L49,72 L32,54 L49,36 Z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M66,29 L89,54 L66,79 L59,72 L76,54 L59,36 Z"/>
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M60,22 L48,86 L57,86 L69,22 Z"/>
</vector>`;

    const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/tech_community_icon_background"/>
    <foreground android:drawable="@drawable/tech_community_icon"/>
</adaptive-icon>`;

    fs.writeFileSync(path.join(drawable, "tech_community_icon.xml"), foreground);
    fs.writeFileSync(path.join(mipmap, "ic_launcher.xml"), adaptiveIcon);
    fs.writeFileSync(path.join(mipmap, "ic_launcher_round.xml"), adaptiveIcon);
    fs.writeFileSync(
      path.join(values, "tech_community_icon_colors.xml"),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="tech_community_icon_background">#1D9BF0</color>
</resources>`
    );

    return config;
  }]);
};
