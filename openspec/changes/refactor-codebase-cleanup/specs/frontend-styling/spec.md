# Frontend Styling - Spec Delta

## ADDED Requirements

### Requirement: Unified CSS Variable System

The system SHALL maintain a single source of truth for CSS variables.

#### Scenario: CSS variables defined in one location

- **WHEN** the application loads
- **THEN** all CSS variables SHALL be defined only in `src/renderer/index.css`
- **AND** no other CSS files SHALL contain `:root` definitions
- **AND** all components SHALL use these variables consistently

#### Scenario: Theme switching uses CSS variables

- **WHEN** user switches theme (glass/light/dark)
- **THEN** CSS variables SHALL update to reflect the new theme
- **AND** all components SHALL automatically reflect the theme change
- **AND** no hard-coded colors SHALL be used

### Requirement: Deprecated Class Removal

The system SHALL NOT use deprecated styling classes.

#### Scenario: No dark:glass-dark usage

- **WHEN** scanning all component files
- **THEN** zero instances of `dark:glass-dark` SHALL be found
- **AND** all glass effects SHALL use the unified `.glass` class

#### Scenario: No legacy semantic classes

- **WHEN** scanning all component files
- **THEN** zero instances of `glass-header`, `glass-card`, `glass-effect` SHALL be found
- **AND** all components SHALL use semantic HTML with appropriate Tailwind classes

### Requirement: Hard-coded Color Elimination

The system SHALL minimize hard-coded color values.

#### Scenario: Hard-coded colors limited

- **WHEN** scanning all TypeScript/TSX files
- **THEN** fewer than 5 instances of hard-coded hex colors SHALL be found
- **AND** all theme-related colors SHALL use CSS variables or Tailwind classes

#### Scenario: Color consistency across themes

- **WHEN** user switches between themes
- **THEN** all UI elements SHALL maintain appropriate contrast ratios (≥4.5:1)
- **AND** no visual artifacts or color mismatches SHALL occur

### Requirement: Style Usage Guidelines

The system SHALL provide clear guidelines for styling approaches.

#### Scenario: Style method selection

- **WHEN** developer needs to style a component
- **THEN** documentation SHALL specify which method to use (CSS variables, Tailwind, etc.)
- **AND** ESLint rules SHALL enforce the guidelines
- **AND** code review SHALL check compliance

## MODIFIED Requirements

### Requirement: Glass Effect Implementation

The system SHALL provide a unified glass effect implementation.

**Previous**: Glass effects were implemented inconsistently across components with multiple variations.

**Updated**: The system SHALL use a single `.glass` class for all glass effects, with optional intensity modifiers.

#### Scenario: Glass effect applied consistently

- **WHEN** a component needs a glass effect
- **THEN** it SHALL use the `.glass` class from `src/renderer/styles/glass-effect.css`
- **AND** it MAY use intensity modifiers (`.glass-light`, `.glass-medium`, `.glass-heavy`)
- **AND** it SHALL NOT implement custom glass effects

#### Scenario: Glass effect works in all themes

- **WHEN** glass effect is applied
- **THEN** it SHALL work correctly in glass, light, and dark themes
- **AND** backdrop blur SHALL be applied appropriately
- **AND** transparency SHALL adjust based on theme

## REMOVED Requirements

### Requirement: Multiple CSS Variable Definitions

**Reason**: Caused inconsistencies and conflicts between different CSS files.

**Migration**: All CSS variables consolidated into `src/renderer/index.css`. Components using variables from `App.css` will automatically use the consolidated definitions.

### Requirement: Dark Mode Specific Glass Class

**Reason**: The `dark:glass-dark` class was redundant and caused confusion.

**Migration**: Replace all instances of `dark:glass-dark` with `.glass`. The unified glass class handles dark mode automatically.

