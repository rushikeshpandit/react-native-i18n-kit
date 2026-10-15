# I18nKit Example App

This folder contains the **JavaScript/TypeScript side** of the example
app (`App.tsx`, screens, translation files). The native `android/` and
`ios/` folders are intentionally **not committed** — generated RN
project boilerplate goes stale and causes more merge conflicts than it
prevents. Generate them once, locally:

```bash
# from repo root
cd example
npx @react-native-community/cli@latest init I18nKitExample --directory tmp-scaffold --skip-install
# move the generated android/ and ios/ folders next to this README
rsync -a tmp-scaffold/android ./
rsync -a tmp-scaffold/ios ./
rm -rf tmp-scaffold

yarn install
cd ios && pod install && cd ..

yarn android   # or: yarn ios
```

Because `metro.config.js` adds `../` (the library root) as a watch
folder, and `package.json` links `react-native-i18n-kit` via
`"link:.."`, any edit you make to `../src`, `../android`, or `../ios`
is picked up by this example app immediately — there's no publish/
relink step while developing the library itself.
