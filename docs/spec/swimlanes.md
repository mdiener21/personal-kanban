# Swim Lanes

## Overview

- Swim lanes are a per-board by label, label-group or priorty
- A quick-access toggle in the board controls menu allows enabling/disabling swim lanes directly, without opening the Settings modal
- The full swim lane configuration (grouping mode by label, label-group or priority selection) remains in Settings
- The board becomes a grid of swim lane rows by workflow columns
- Swim lanes can be toggled on and off without a page reload

## Grouping Modes

- `label` - lane assignment uses `task.swimlaneLabelId` when present, otherwise the first task label
- `label-group` - the user selects one label group, then each label value in that group becomes a lane
- `priority` - lane assignment uses task priority with stable order `Urgent`, `High`, `Medium`, `Low`, `None`
- Tasks with no matching lane value are shown in `No Group`

## Lane Ordering

- Lane order is customizable via drag-and-drop in the Settings modal
- When swim lanes are enabled, a reorderable list shows all lanes for the current grouping mode
- Custom order is stored as `swimLaneOrder` in per-board settings (array of lane keys)
- An empty order array falls back to default sorting (alphabetical for labels, fixed for priority)
- Changing the grouping mode or label group resets the custom order
- Lanes not present in the saved order (e.g. newly created labels) appear at the end in default order

## Lane Assignment Rules

- Dragging between swim lanes persists the new lane assignment immediately
- In `label` mode, dropping into a label lane also prepends that label to `task.labels` if needed
- Dropping into `No Group` stores an explicit empty-string lane assignment
- In `label-group` mode, lane moves replace labels only within the selected group and preserve labels from other groups
- In `priority` mode, lane moves update `task.priority`

## Layout Behavior

- Workflow column headers remain visible while scrolling vertically through the swim lane grid
- Each lane renders a full-width header above its row of cells
- Lane headers stay sticky on the left during horizontal scrolling
- Each lane row contains one cell per workflow column

## Done-Column Behavior

- Expanded swim lane rows hide task cards already in the Done column to keep lanes compact
- The Done cell remains an active drop target and shows compact helper text instead of the hidden cards
- Dragging into Done still persists the move and inserts the task at the top of the flattened Done order

## Collapse and Expand Controls

- Each swim lane row has a chevron-only collapse toggle; the button border and background appear only on hover
- Collapsed rows keep the lane header visible and show lane name plus active and done task counts
- Workflow columns remain collapsible while swim lanes are enabled
- Individual swim lane cells can be collapsed independently through a small chevron toggle
- Cell collapse state is persisted with composite keys in settings
- Row collapse and column collapse take precedence over cell collapse

## Add Task from Swim Lane Cells

- Each non-Done, non-column-collapsed swim lane cell has a plus button
- Adding from a swim lane cell preselects the target column
- In label and label-group modes, the lane label is preselected
- In priority mode, the lane priority is preselected

## Mobile Behavior

- Swim lane rows switch from CSS grid to flex layout on mobile
- Lane headers remain sticky on the left edge while columns use snap-scrolling
- Expanded lane headers show lane names vertically to preserve column width
- Collapsed rows revert to a horizontal full-width bar

## Design

- Swim lane mode reuses the board's card language: white or themed surface panels, subtle borders, small-radius corners, and soft elevation for headers
- The board sits inside a horizontally scrollable swim lane canvas with 16px row and column gaps so each row reads as a clean matrix of lane-by-column cells
- Workflow columns are represented by a dedicated sticky header row at the top of the grid; each header uses the column accent color as a 4px leading stripe and keeps the task counter visible
- Swim lane row headers are visually lighter than workflow columns: they are left-sticky text rows with a bottom accent border, bold lane title, compact metadata badges, and a chevron-only collapse affordance
- Metadata badges use pill styling with muted borders and surface fills so active and done counts remain readable without competing with task cards
- Swim lane cells use lightly tinted backgrounds derived from the owning column accent color, keeping column identity visible even when the grid is dense
- Task stacks inside swim lane cells use a single-column card layout with generous vertical spacing, transparent cell interiors, and no extra framing beyond the cell container
- Column collapse switches the corresponding header and cell summaries into vertical writing, creating narrow compact rails while preserving column identity and counts
- Cell collapse uses a smaller inline chevron control and reduces the cell to its summary header, while row collapse hides the cell grid entirely and leaves only the sticky lane header bar visible
- Add-task actions inside cells are small trailing icon buttons that match the collapse controls: bordered, compact, and only visually emphasized on hover
- On mobile, the layout shifts from strict CSS grid rows to a horizontally scrollable flex presentation so columns remain usable on small screens while sticky lane headers continue to anchor context
