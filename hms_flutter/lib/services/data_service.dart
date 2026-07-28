import 'package:flutter/foundation.dart';
import '../models/models.dart';

class DataService extends ChangeNotifier {
  static final DataService _instance = DataService._internal();
  factory DataService() => _instance;
  DataService._internal() {
    _initDefaultData();
  }

  UserProfile? currentUser;
  bool isDarkMode = false;

  final List<Patient> _patients = [];
  final List<ChecklistItem> _checklists = [];
  final List<InventoryItem> _inventory = [];
  final List<HMSTask> _tasks = [];
  final List<ActivityLog> _logs = [];

  List<Patient> get patients => List.unmodifiable(_patients);
  List<ChecklistItem> get checklists => List.unmodifiable(_checklists);
  List<InventoryItem> get inventory => List.unmodifiable(_inventory);
  List<HMSTask> get tasks => List.unmodifiable(_tasks);
  List<ActivityLog> get logs => List.unmodifiable(_logs);

  void toggleDarkMode() {
    isDarkMode = !isDarkMode;
    notifyListeners();
  }

  bool login(String username, String password, String role) {
    currentUser = UserProfile(
      id: 'USR-${DateTime.now().millisecondsSinceEpoch}',
      username: username.isEmpty ? 'admin' : username,
      fullName: username.isEmpty ? 'Hospital Admin' : username.toUpperCase(),
      role: role,
      department: 'Clinical Operations',
    );
    notifyListeners();
    return true;
  }

  void logout() {
    currentUser = null;
    notifyListeners();
  }

  void addPatient(Patient patient) {
    _patients.insert(0, patient);
    _logs.insert(
      0,
      ActivityLog(
        id: 'LOG-${DateTime.now().millisecondsSinceEpoch}',
        title: 'New Patient Admitted',
        subtitle: '${patient.name} (${patient.ward} - Room ${patient.roomNumber})',
        timestamp: 'Just now',
        type: 'admission',
      ),
    );
    notifyListeners();
  }

  void toggleChecklist(String id) {
    final index = _checklists.indexWhere((item) => item.id == id);
    if (index != -1) {
      _checklists[index].isCompleted = !_checklists[index].isCompleted;
      _logs.insert(
        0,
        ActivityLog(
          id: 'LOG-${DateTime.now().millisecondsSinceEpoch}',
          title: 'Checklist Item Updated',
          subtitle: '${_checklists[index].title} marked as ${_checklists[index].isCompleted ? "Complete" : "Pending"}',
          timestamp: 'Just now',
          type: 'checklist',
        ),
      );
      notifyListeners();
    }
  }

  void updateTaskStatus(String id, String newStatus) {
    final index = _tasks.indexWhere((task) => task.id == id);
    if (index != -1) {
      _tasks[index].status = newStatus;
      notifyListeners();
    }
  }

  void addInventoryItem(InventoryItem item) {
    _inventory.insert(0, item);
    notifyListeners();
  }

  void _initDefaultData() {
    _patients.addAll([
      Patient(
        id: 'PAT-1001',
        name: 'Rajesh Kumar',
        age: 45,
        gender: 'Male',
        ward: 'ICU Ward A',
        roomNumber: '102-A',
        doctorName: 'Dr. A. Sharma',
        status: 'ICU',
        admissionDate: DateTime.now().subtract(const Duration(days: 2)),
      ),
      Patient(
        id: 'PAT-1002',
        name: 'Priya Patel',
        age: 32,
        gender: 'Female',
        ward: 'General Ward B',
        roomNumber: '204',
        doctorName: 'Dr. V. Mehta',
        status: 'Admitted',
        admissionDate: DateTime.now().subtract(const Duration(days: 1)),
      ),
      Patient(
        id: 'PAT-1003',
        name: 'Sunil Verma',
        age: 61,
        gender: 'Male',
        ward: 'Deluxe Suite',
        roomNumber: '401',
        doctorName: 'Dr. R. Gupta',
        status: 'Observation',
        admissionDate: DateTime.now().subtract(const Duration(hours: 6)),
      ),
      Patient(
        id: 'PAT-1004',
        name: 'Ananya Roy',
        age: 28,
        gender: 'Female',
        ward: 'Maternity Ward',
        roomNumber: '305',
        doctorName: 'Dr. S. Kulkarni',
        status: 'Admitted',
        admissionDate: DateTime.now().subtract(const Duration(days: 3)),
      ),
    ]);

    _checklists.addAll([
      ChecklistItem(
        id: 'CHK-01',
        title: 'Oxygen Cylinder Level Check',
        category: 'Equipment',
        location: 'ICU Floor 1',
        isCompleted: true,
        assignedTo: 'N. Technician',
      ),
      ChecklistItem(
        id: 'CHK-02',
        title: 'Sanitization & Linen Change',
        category: 'Hygiene',
        location: 'Room 201 to 210',
        isCompleted: false,
        assignedTo: 'Housekeeping Staff',
      ),
      ChecklistItem(
        id: 'CHK-03',
        title: 'Emergency Crash Cart Audit',
        category: 'Safety',
        location: 'ER Room 2',
        isCompleted: false,
        assignedTo: 'Nurse In-Charge',
      ),
      ChecklistItem(
        id: 'CHK-04',
        title: 'Ventilator Pressure Calibration',
        category: 'Equipment',
        location: 'ICU Ward A',
        isCompleted: true,
        assignedTo: 'Bio-Medical Eng.',
      ),
    ]);

    _inventory.addAll([
      InventoryItem(
        id: 'INV-101',
        name: 'Paracetamol 500mg (Tabs)',
        category: 'Medicine',
        stockQuantity: 1200,
        minThreshold: 300,
        unit: 'Strips',
      ),
      InventoryItem(
        id: 'INV-102',
        name: 'Surgical Gloves (Size L)',
        category: 'Consumable',
        stockQuantity: 45,
        minThreshold: 100,
        unit: 'Boxes',
      ),
      InventoryItem(
        id: 'INV-103',
        name: 'N95 Respirator Masks',
        category: 'Consumable',
        stockQuantity: 200,
        minThreshold: 50,
        unit: 'Pieces',
      ),
      InventoryItem(
        id: 'INV-104',
        name: 'IV Saline 500ml',
        category: 'Medicine',
        stockQuantity: 28,
        minThreshold: 50,
        unit: 'Bottles',
      ),
    ]);

    _tasks.addAll([
      HMSTask(
        id: 'TSK-501',
        title: 'Repair Cardiac Monitor Sensor',
        description: 'Sensor reading intermittently dropping in ICU Bed 3.',
        priority: 'High',
        status: 'In Progress',
        department: 'Biomedical',
      ),
      HMSTask(
        id: 'TSK-502',
        title: 'Monthly Department Meeting',
        description: 'Review quarterly quality metrics and staffing roster.',
        priority: 'Medium',
        status: 'Pending',
        department: 'Administration',
      ),
      HMSTask(
        id: 'TSK-503',
        title: 'Restock Pharmacy Emergency Bay',
        description: 'Fulfill approved material requisition #MR-8821.',
        priority: 'High',
        status: 'Pending',
        department: 'Pharmacy',
      ),
    ]);

    _logs.addAll([
      ActivityLog(
        id: 'LOG-01',
        title: 'System Initialized',
        subtitle: 'Stavya Intelligence HMS Flutter App active',
        timestamp: '10m ago',
        type: 'system',
      ),
      ActivityLog(
        id: 'LOG-02',
        title: 'New Admission Registered',
        subtitle: 'Rajesh Kumar admitted to ICU Ward A',
        timestamp: '25m ago',
        type: 'admission',
      ),
    ]);
  }
}
