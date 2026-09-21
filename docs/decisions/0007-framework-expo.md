# 0007. Framework: Expo (React Native, TypeScript)

Status: Accepted

## Context
The app targets iOS first and Android later from one codebase. Code is
written by Claude Code. The project owner does not write the code, but must
be able to read it, review pull requests and make decisions based on it.
The owner has a frontend and JavaScript background, and experience with
component based design systems on the web.

Options considered: Expo (React Native with TypeScript) and Flutter (Dart).

## Decision
Use Expo with React Native and TypeScript.

## Reasons
- **Readable for the owner.** React components, props, state and hooks look
  like the web code the owner already knows, which makes reviews and
  decisions realistic. Flutter's nested widget trees would be harder to
  judge at first.
- **Design system thinking carries over.** Tokens, reusable components and
  variants work the same way as on the web.
- **Strong ecosystem for AI assisted coding.** TypeScript and React have
  extensive documentation and examples, which tends to give stable results
  and easier debugging.
- **Native iOS feel.** React Native renders the platform's own components,
  which suits the iOS references (tab bar, sheets). Flutter draws its own UI
  and has to imitate iOS.
- **Free testing on a real iPhone.** Expo Go runs the app from a QR code,
  without Xcode and without re-signing every seven days.

## Consequences
- TypeScript in strict mode for all app code.
- The iOS widget (after MVP) is written in Swift and added as a native
  extension. From that point the app needs an Expo development build
  instead of Expo Go, and a paid Apple Developer account for App Groups.
- Libraries are chosen so that the PoC keeps working in Expo Go for as long
  as possible.
- Storage must stay plain and shareable (NFR-006) so the widget can read it
  later.
- Flutter stays in the owner's separate learning project (Stegräknare) and
  is not used here.
