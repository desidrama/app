# Copilot Instructions for desidrama

## Project Overview
- **Architecture:** This is a React Native project structured for modularity and scalability. The main entry is `App.tsx`, with navigation handled via `src/navigation/` and state managed by Redux in `src/redux/`.
- **Major Components:**
  - **Screens:** Located in `src/screens/`, grouped by feature (auth, home, profile, rewards, splash).
  - **Components:** Reusable UI elements in `src/components/`.
  - **Services:** API and business logic in `src/services/`.
  - **Redux:** State slices in `src/redux/slices/` and store setup in `src/redux/store.ts`.
  - **Types:** Shared TypeScript types in `src/types/`.
  - **Utils:** Constants and storage helpers in `src/utils/`.

## Developer Workflows
- **Install dependencies:**
  ```powershell
  npm install
  ```
- **Start development server:**
  ```powershell
  npx expo start
  ```
- **Build for production:**
  (Add platform-specific build commands if available)
- **Testing:**
  (No test setup detected; add instructions if tests are added)

## Project-Specific Patterns
- **Navigation:** Uses React Navigation. Main navigators are in `src/navigation/`. Tab and stack navigation are separated for clarity.
- **State Management:** Redux Toolkit is used. Slices are organized by domain (auth, user, video). Always update state via actions defined in slices.
- **Styling:** Tailwind CSS via NativeWind. Global styles in `global.css`, config in `tailwind.config.js` and `postcss.config.mjs`.
- **API Integration:** All API calls are abstracted in `src/services/api.ts` and related service files. Use these for network requests.
- **Assets:** Static files are in `assets/`.

## Integration Points
- **External Dependencies:**
  - React Native, Expo, Redux Toolkit, React Navigation, NativeWind (Tailwind CSS for RN)
- **Cross-Component Communication:**
  - Use Redux for shared state. Pass props for local state.

## Conventions
- **File Naming:** Use PascalCase for components/screens, camelCase for functions/variables.
- **Directory Structure:** Feature-based grouping in `src/screens/` and `src/redux/slices/`.
- **Type Safety:** Use TypeScript throughout. Shared types in `src/types/`.

## Key Files
- `App.tsx` (entry point)
- `src/navigation/AppNavigator.tsx`, `src/navigation/TabNavigator.tsx` (navigation setup)
- `src/redux/store.ts`, `src/redux/slices/*` (state management)
- `src/services/api.ts` (API abstraction)
- `tailwind.config.js`, `global.css` (styling)

---
_If any section is unclear or missing, please provide feedback to improve these instructions._
