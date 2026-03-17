# SwiftProjects Status Tool

A Tampermonkey userscript that adds bulk status management to [SwiftProjects](https://swiftprojects.io). Select multiple tasks or requirements and apply a status to all of them in one click.

---

## Features

- **Click to select** individual tasks or requirements
- **Select Visible** — selects all currently rendered items on screen
- **Bulk apply** Approved, Pending, Submitted, or Cancelled status
- Automatically skips items already set to the target status
- Draggable panel — move it anywhere on screen
- Minimizes to a small icon when not in use, with a badge showing selection count

---

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click the link below to install the script directly:

   **[⬇ Install Status Tool](https://raw.githubusercontent.com/Elfidro/swiftprojects-status-tool/main/status-tool.user.js)**

3. Tampermonkey will open a confirmation page — click **Install**
4. Navigate to [swiftprojects.io](https://swiftprojects.io) and the tool will appear in the bottom-left corner

---

## Usage

| Action | How |
|---|---|
| Open / close panel | Click the **✓** icon |
| Select an item | Click the checkbox on the left of any row |
| Select a range | Click one item, then **Shift+click** another |
| Select all visible | Click **Select Visible** |
| Apply a status | Choose from the dropdown, click **Apply Status** |
| Clear selection | Click **Clear Selection** |
| Move the panel | Drag the header bar |

---

## Updates

The script supports **auto-updates** via Tampermonkey. When a new version is pushed to this repo, Tampermonkey will notify you and offer to update automatically.

To check manually: Tampermonkey Dashboard → Status Tool → Check for updates.

---

## Changelog

### v1.01
- Polished UI: dark slate header, gradient buttons, Inter font, rounded panel
- Checkbox style updated to match SwiftProjects' native checkbox appearance
- Improved select-visible logic (checks rendered state, not just viewport position)

### v1.00
- Initial release
