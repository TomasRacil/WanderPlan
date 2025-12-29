# WanderPlan 🌍✈️

**WanderPlan** is a modern, responsive travel planning application designed to help you organize every aspect of your study abroad or vacation trips. Built with **React**, **Vite**, **Redux Toolkit**, and **Tailwind CSS**.

## 🚀 Key Features

### ✅ Implemented & Working
*   **Trip Overview**:
    *   Set destination, dates, travel style, and custom cover images.
    *   Trip duration calculator.
*   **Budget Tracking**:
    *   Set a total budget in your home currency.
    *   Log expenses with support for multiple currencies (automatic conversion to home currency).
    *   Visual progress bar and category breakdown (Accommodation, Food, Transport, etc.).
    *   **[NEW]** Multi-currency support: Add expenses in any currency (EUR, CZK, JPY, etc.).
    *   **[NEW]** Trip Reporting Currency: Change the primary currency used for totals and conversions.
*   **Itinerary Management**:
    *   Add events (Flights, Activities, Hotels) with date, duration, and flexible timezones.
    *   **[NEW]** **Automatic Timezone Detection**: Automatically fetches the correct timezone based on coordinates using `timeapi.io`.
    *   **[NEW]** **Duration-based Events**: Specify duration in hours/minutes; end times are calculated automatically.
    *   **[NEW]** **Enhanced Display**: Itinerary cards show explicit start/end dates and times with `+N day` indicators for overnight travel.
    *   **[NEW]** **Timezone Shifts**: Clearly displays destination timezones if they differ from the starting point.
    *   **[NEW]** **Anchored Sticky Headers**: Day headers stay perfectly docked under the navigation bar as you scroll.
    *   **[NEW]** Support for **Overnight Activities** (Start Date != End Date).
    *   Automatic sorting of events by date and time in a beautiful timeline view.
    *   Google Maps route link generation.
*   **AI Integration 🤖**:
    *   **Specialized Content Generation**: Granular generation for Itinerary gaps, Pre-trip tasks, Packing List, and Phrasebook.
    *   **[NEW] Structured Output 🏗️**: Utilizes Google Gemini's JSON support with strict modular schemas (`src/schemas/`) for guaranteed valid data.
    *   **[NEW] Intelligent Error Handling**: User-friendly limits handling (Quota Exceeded) with a dedicated modal instead of silent failures.
    *   **[NEW] Lazy Distillation ⚗️**: Optimally processes attachments by extracting and caching text only once, reducing token usage on subsequent requests.
    *   **[NEW] AI Change Review System**: Preview, accept, or reject AI-generated suggestions before they are applied. 
    *   **[NEW] AI Modes**: Choose between "Add New", "Update Existing", "Fill Gaps", or "Remove Duplicates" for precise control.
    *   **Context Aware**: Analyzes existing trip data (dates, style, current items) to provide relevant suggestions.
    *   **Garbage Collection**: Automatically cleans up AI-extracted context when attachments are deleted to keep memory fresh.
*   **Smart Checklists**:
    *   **Pre-Trip Tasks**: Manage visas, vaccinations, and documents.
    *   **Packing List**: Categorized packing essentials.
        *   **[NEW] List Management**: Auto-sort completed items to bottom, "Clear List" functionality, and AI deduplication.
    *   Support for attachments (links/notes) on tasks.
*   **Data Persistence**:
    *   **Save/Load**: Export your entire trip plan to a JSON file or **[NEW] ZIP Archive** (including attachments) and load it back anytime.
    *   **IndexedDB**: Migrated storage layer to handle large file attachments (images/PDFs) without size limits.

*   **Centralized Document Library �**:
    *   **[NEW] Project-wide Storage**: All uploaded documents are now stored in a central repository, allowing files to be reused across multiple itinerary events or pre-trip tasks without duplication.
    *   **[NEW] Library Manager**: A dedicated view to manage all project documents, see AI summaries, and toggle "Include in Print" status for specific files.
    *   **[NEW] AI Context Optimization**: Dramatically reduced AI payload size by sending document IDs and cached summaries instead of redundant base64 data, significantly improving generation speed.
    *   **[NEW] Ultra-Robust Migration**: Intelligent engine transitions old trip data and backups into the new structure, merging fragmented data securely.
    *   **[NEW] Enhanced UX**: Full drag-and-drop support with visual feedback/animations and built-in PDF/Image previews.
    *   **[NEW] Multimodal AI Integration**: Gemini "sees" and summarizes your documents (tickets, confirmations) to provide context-aware suggestions while minimizing token usage.
*   **Localization 🌍**:
    *   Full support for **English (EN)** and **Czech (CS)**.
    *   **Deep Localization**: Multilingual support extends to all modal labels, dropdowns (Budget Categories, Event Types), and placeholders.
    *   Language switcher in the header.
*   **Interactive Map 🗺️**:
    *   **Date Navigation**: Filter markers by specific days or view the "Whole Trip".
    *   **[NEW] High-Precision Geocoding**: Integrated Nominatim (OpenStreetMap) with **smart retry strategies** (context-aware search) for precisely pinned event locations.
    *   Visualize your itinerary with an interactive map (Leaflet).
    *   **Photon API Integration**: High-reliability geocoding powered by Photon (OpenStreetMap data) for primary search.
*   **PWA Support 📲**:
    *   **Manual Updates**: A notification and "Update" button in settings appear when a new version is available.
    *   Installable as a desktop or mobile application for offline access.
*   **Enhanced UI/UX 🎨**:
    *   **[NEW] Unified AI Tool**: A redesigned, full-width AI Generation section with integrated mode selection and attachment management.
    *   **Mobile-First Navigation**: Dedicated bottom navigation bar for mobile users.
    *   **Optimized Headers**: Clean, 3-row responsive headers for all list views with consistent alignment.
    *   **Unlimited Budget Support**: Set budgets to "Unlimited" for flexible trip planning with visual '∞' indicators.
    *   Modern Modal interface and improved DateTime pickers.
    *   **Enhanced Overview**: Tips rendered with markdown, direct task completion from dashboard, and improved "Next Focus" logic.
    *   Task Time Estimates for better pre-trip planning.

### 🚧 Future Roadmap
*   **[x] AI Review System**: Allow users to preview and vet AI suggestions.
*   **[x] PWA Support**: Convert to Progressive Web App with update controls.
*   **[x] Interactive Map**: Full Leaflet integration with date-based filtering.
*   **[x] Automatic Timezones**: Coordinate-based timezone detection.
*   **[ ] Calendar Export**: Export itinerary to **.ics** format for Google Calendar.
*   **[ ] Multi-Trip Management**: Allow users to create, save, and switch between multiple trips locally.
*   **[ ] Cloud Sync**: User authentication and database storage for accessing trips across devices.
*   **[ ] Collaborative Editing**: Real-time multiplayer editing for group travel planning.
*   **[ ] Mobile App**: React Native mobile application for native experience.

---

## � Tech Stack

*   **Framework**: React 18
*   **Build Tool**: Vite
*   **State Management**: Redux Toolkit
*   **Testing**: Vitest
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **AI**: Google Gemini API (Multimodal + Structured Output)

---

## 🏃‍♂️ Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/wanderplan.git
    cd wanderplan
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```

5.  **Run Tests**:
    ```bash
    npm test
    ```

## 📄 License
MIT