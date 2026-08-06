import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_widgets.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  String _searchQuery = '';
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', 'Admitted', 'ICU', 'Observation', 'Pre-OP', 'Post-OP'];

  void _showAddPatientDialog() {
    final nameCtrl = TextEditingController();
    final ageCtrl = TextEditingController(text: '30');
    final roomCtrl = TextEditingController(text: '101');
    final doctorCtrl = TextEditingController(text: 'Dr. A. Sharma');
    String ward = 'ICU Ward A';
    String gender = 'Male';
    String status = 'Admitted';

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Admit New Patient', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Patient Full Name', prefixIcon: Icon(Icons.person)),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: ageCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Age'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: gender,
                        decoration: const InputDecoration(labelText: 'Gender'),
                        items: ['Male', 'Female', 'Other'].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                        onChanged: (val) { if (val != null) gender = val; },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: roomCtrl,
                  decoration: const InputDecoration(labelText: 'Room / Bed Number', prefixIcon: Icon(Icons.bed)),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: doctorCtrl,
                  decoration: const InputDecoration(labelText: 'Attending Doctor', prefixIcon: Icon(Icons.medical_services)),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: status,
                  decoration: const InputDecoration(labelText: 'Admission Status'),
                  items: ['Admitted', 'ICU', 'Observation', 'Pre-OP', 'Post-OP'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (val) { if (val != null) status = val; },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nameCtrl.text.isNotEmpty) {
                  final newPatient = Patient(
                    id: 'PAT-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
                    name: nameCtrl.text,
                    age: int.tryParse(ageCtrl.text) ?? 30,
                    gender: gender,
                    ward: ward,
                    roomNumber: roomCtrl.text,
                    doctorName: doctorCtrl.text,
                    status: status,
                    admissionDate: DateTime.now(),
                  );
                  DataService().addPatient(newPatient);
                  setState(() {});
                  Navigator.pop(ctx);
                }
              },
              child: const Text('Admit Patient'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final ds = DataService();
    final allPatients = ds.patients;

    final filteredPatients = allPatients.where((p) {
      final matchesSearch = p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.id.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.doctorName.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesFilter = _selectedFilter == 'All' || p.status.toLowerCase() == _selectedFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    }).toList();

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Search Input
            TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Search patients by name, ID or doctor...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () => setState(() => _searchQuery = ''),
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 12),

            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map((f) {
                  final isSelected = _selectedFilter == f;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(f),
                      selected: isSelected,
                      selectedColor: AppTheme.primaryLight.withOpacity(0.2),
                      checkmarkColor: AppTheme.primaryBlue,
                      onSelected: (selected) {
                        setState(() => _selectedFilter = f);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Patient List
            Expanded(
              child: filteredPatients.isEmpty
                  ? const Center(
                      child: Text('No patient records found.'),
                    )
                  : ListView.builder(
                      itemCount: filteredPatients.length,
                      itemBuilder: (context, index) {
                        final p = filteredPatients[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: AppTheme.primaryBlue.withOpacity(0.1),
                                  child: Icon(
                                    p.gender == 'Female' ? Icons.female : Icons.male,
                                    color: AppTheme.primaryBlue,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            p.name,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '(${p.age} yrs)',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: AppTheme.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'ID: ${p.id} • ${p.ward} (Room ${p.roomNumber})',
                                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Doctor: ${p.doctorName}',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ),
                                ),
                                StatusBadge.fromStatus(p.status),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddPatientDialog,
        icon: const Icon(Icons.person_add),
        label: const Text('Admit Patient'),
        backgroundColor: AppTheme.primaryBlue,
        foregroundColor: Colors.white,
      ),
    );
  }
}
