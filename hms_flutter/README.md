# Stavya Intelligence - Flutter Cross-Platform Hospital Management System App

Welcome to the **Stavya Intelligence HMS Flutter Application**!

This project provides a modern, responsive cross-platform Flutter application for **Stavya Intelligence Hospital Management System**, designed to run seamlessly on Android, iOS, Web, and Desktop (Windows/macOS/Linux).

---

## 📱 Features Included

1. **🔐 Authentication & Role Management**
   - Access control roles: Administrator, Doctor/Medical Staff, HOD, Storekeeper, and Gate Security Officer.
   - Quick role preset switcher and login system.

2. **📊 Interactive Hospital Dashboard**
   - Live metrics: Total Patients, ICU Ward Occupancy, Pending Checklists, Low Stock Alerts, and Open Tasks.
   - Quick action shortcuts (Admit Patient, Add Checklist, Stock Request, Log Complaint).
   - Real-time system activity logs stream.

3. **🏥 Patient Admissions & Management**
   - Patient search by name, ID, or attending doctor.
   - Status filters (Admitted, ICU, Observation).
   - "Admit New Patient" interactive dialog.

4. **📋 Room & Departmental Inspection Checklists**
   - Category filtering (Equipment, Hygiene, Safety).
   - Real-time progress bar tracking completed inspection items.
   - Interactive checkbox state updates.

5. **📦 Pharmacy & Inventory Control**
   - Medicine, Consumable & Equipment stock tracking.
   - Low-stock visual alert badges with minimum reorder thresholds.
   - Material Requisition submitter.

6. **🛠️ Task Management & Complaints**
   - Priority levels (High, Medium, Low).
   - Status transitions (Pending → In Progress → Completed).

7. **⚙️ Preferences & Theme System**
   - Light and Dark mode toggle.
   - User profile management & Firebase sync status.

---

## 🚀 How to Run the App

### Prerequisites
- Install [Flutter SDK](https://docs.flutter.dev/get-started/install) (version 3.0+ recommended).
- Ensure Dart & Flutter extensions are installed in VS Code or Android Studio.

### Commands

1. Navigate to the project directory:
   ```bash
   cd hms_flutter
   ```

2. Get package dependencies:
   ```bash
   flutter pub get
   ```

3. Run in Chrome (Web):
   ```bash
   flutter run -d chrome
   ```

4. Run on connected Android / iOS device or emulator:
   ```bash
   flutter run
   ```

5. Build production bundle (Web):
   ```bash
   flutter build web
   ```

---

## 📂 Project Structure

```
hms_flutter/
├── pubspec.yaml
├── README.md
└── lib/
    ├── main.dart
    ├── theme/
    │   └── app_theme.dart
    ├── models/
    │   └── models.dart
    ├── services/
    │   └── data_service.dart
    ├── widgets/
    │   ├── stat_card.dart
    │   └── custom_widgets.dart
    └── screens/
        ├── login_screen.dart
        ├── home_navigation_screen.dart
        ├── dashboard_screen.dart
        ├── patients_screen.dart
        ├── checklists_screen.dart
        ├── inventory_screen.dart
        ├── tasks_screen.dart
        └── settings_screen.dart
```
