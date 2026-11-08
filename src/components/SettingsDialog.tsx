// A game's Settings sheet is @tastic/shell's: appearance, Blur, sound, haptics, Keep Awake and the version, then
// Solitaire's own sections (the pack's `SettingsSections`, components/SettingsSections.tsx): the game's rules, Gameplay
// and Cards. GameChrome renders it in the game's own Portal.Host (withGameProviders). Imported through here so a screen test can stand it in with one mock, without
// loading the shell's whole barrel.
export { SettingsDialog } from '@tastic/shell'
