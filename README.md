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
    *   Add events (Flights, Activities, Hotels) with date, time, and location.
    *   **[NEW]** Support for **Overnight Activities** (Start Date != End Date).
    *   **[NEW]** Time range support (Start Time - End Time) with validation.
    *   Automatic sorting of events by date and time in a beautiful timeline view.
    *   Google Maps route link generation.
*   **AI Integration 🤖**:
    *   **Specialized Content Generation**: Granular generation for Itinerary gaps, Pre-trip tasks, Packing List, and Phrasebook.
    *   **[NEW] AI Modes**: Choose between "Add New", "Update Existing", "Fill Gaps", or "Remove Duplicates" for precise control.
    *   **Localized Content**: Generates suggestions in English (EN) or Czech (CS).
    *   **Context Aware**: Analyzes existing trip data (dates, style, current items) to provide relevant suggestions and avoid duplication.
*   **Smart Checklists**:
    *   **Pre-Trip Tasks**: Manage visas, vaccinations, and documents.
    *   **Packing List**: Categorized packing essentials.
    *   **[NEW] List Management**: Auto-sort completed items to bottom, "Clear List" functionality, and AI deduplication.
    *   Support for attachments (links/notes) on tasks.
*   **Data Persistence**:
    *   **Save/Load**: Export your entire trip plan to a JSON file or **[NEW] ZIP Archive** (including attachments) and load it back anytime.
    *   **IndexedDB**: Migrated storage layer to handle large file attachments (images/PDFs) without size limits.

*   **File Attachments & Multimodal AI 📎**:
    *   **Attachments**: Upload images and PDFs to any itinerary event or pre-trip task.
    *   **File Preview**: Built-in modal to preview images and read PDFs without downloading.
    *   **Multimodal AI**: The AI now "sees" your attached images (tickets, screenshots) to generate context-aware suggestions.
*   **Localization 🌍**:
    *   Full support for **English (EN)** and **Czech (CS)**.
    *   **[NEW] Deep Localization**: Multilingual support now extends to all modal labels, dropdowns (Budget Categories, Event Types), and placeholders.
    *   Language switcher in the header.

*   **Interactive Map 🗺️**:
    *   Visualize your itinerary with an interactive map (Leaflet) with auto-coordinates from AI.
*   **Enhanced UI/UX 🎨**:
    *   Modern Modal interface, improved DateTime pickers, and full localization.
    *   **[NEW] Enhanced Overview**: Tips rendered with markdown, direct task completion from dashboard, and improved "Next Focus" logic.
    *   Task Time Estimates for better pre-trip planning.

### 🚧 Future Roadmap
*   **[x] File Attachments**: Upload and store PDFs, JPGs (tickets, reservations) directly in the app.
*   **[x] Quick Preview Dashboard**: "At a glance" view of upcoming activities and unresolved tasks.
*   **[x] Task Time Estimates**: Add "Time to Complete" field for To-Do tasks to better plan pre-trip prep.
*   **[ ] Calendar Export**: Export itinerary to **.ics** format for Google Calendar / Outlook integration.
*   **[x] PWA Support**: Convert to Progressive Web App for offline access and installation.
*   **[ ] Multi-Trip Management**: Allow users to create, save, and switch between multiple distinct trips locally.
*   **[x] Interactive Map**: Full Leaflet/Mapbox integration to visualize itinerary items on a map.
*   **[ ] Cloud Sync**: User authentication and database storage for accessing trips across devices.
*   **[ ] Collaborative Editing**: Real-time multiplayer editing for group travel planning.
*   **[ ] Mobile App**: React Native mobile application for native experience.

---

## � Tech Stack

*   **Framework**: React 18
*   **Build Tool**: Vite
*   **State Management**: Redux Toolkit
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React

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

## 📄 License
MIT