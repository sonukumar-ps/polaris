# Native Boot Path

Polaris currently uses the standard Expo Go path for native development.

## Verified Command

```sh
npm run start -- --localhost
```

The command starts Metro on port `8081` and loads the local `.env` values needed by Expo.

## Expo Go

1. Install Expo Go on the target iOS or Android device.
2. Run `npm run start`.
3. Scan the QR code from the Expo terminal UI, or open the local Expo URL from a simulator.

## Development Build

A custom development build is not required yet because the current dependency set is Expo Go compatible. Revisit EAS development builds when the app adds native modules that Expo Go does not include.

## Last Verified

- Date: 2026-05-19
- Check: Metro responded with `HTTP/1.1 200 OK` on `http://127.0.0.1:8081`.
