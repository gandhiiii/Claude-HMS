class UserProfile {
  final String id;
  final String username;
  final String fullName;
  final String role; // 'admin', 'hod', 'doctor', 'storekeeper', 'security'
  final String department;

  UserProfile({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    required this.department,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? '',
      role: json['role'] ?? 'doctor',
      department: json['department'] ?? 'General',
    );
  }
}

class Patient {
  final String id;
  final String name;
  final int age;
  final String gender;
  final String ward;
  final String roomNumber;
  final String doctorName;
  final String status; // 'Admitted', 'Discharged', 'ICU', 'Observation'
  final DateTime admissionDate;

  Patient({
    required this.id,
    required this.name,
    required this.age,
    required this.gender,
    required this.ward,
    required this.roomNumber,
    required this.doctorName,
    required this.status,
    required this.admissionDate,
  });
}

class ChecklistItem {
  final String id;
  final String title;
  final String category; // 'Room Check', 'Hygiene', 'Equipment', 'Safety'
  final String location;
  bool isCompleted;
  final String assignedTo;

  ChecklistItem({
    required this.id,
    required this.title,
    required this.category,
    required this.location,
    this.isCompleted = false,
    required this.assignedTo,
  });
}

class InventoryItem {
  final String id;
  final String name;
  final String category; // 'Medicine', 'Equipment', 'Consumable'
  final int stockQuantity;
  final int minThreshold;
  final String unit;

  InventoryItem({
    required this.id,
    required this.name,
    required this.category,
    required this.stockQuantity,
    required this.minThreshold,
    required this.unit,
  });

  bool get isLowStock => stockQuantity <= minThreshold;
}

class HMSTask {
  final String id;
  final String title;
  final String description;
  final String priority; // 'High', 'Medium', 'Low'
  String status; // 'Pending', 'In Progress', 'Completed'
  final String department;

  HMSTask({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.department,
  });
}

class ActivityLog {
  final String id;
  final String title;
  final String subtitle;
  final String timestamp;
  final String type; // 'admission', 'inventory', 'checklist', 'security'

  ActivityLog({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.timestamp,
    required this.type,
  });
}
