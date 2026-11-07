// A game's Settings sheet is @tastic/shell's: Lock Orientation, appearance, Blur, sound, haptics, Keep Awake and the
// version, then the game's own rule rows (GameChrome's `settingsContent`, its children), then Solitaire's Gameplay and
// Cards sections (the pack's `SettingsSections`, components/SettingsSections.tsx). GameChrome renders it in the game's
// own Portal.Host (withGameProviders). Imported through here so a screen test can stand it in with one mock, without
// loading the shell's whole barrel.
export { SettingsDialog } from '@tastic/shell'
