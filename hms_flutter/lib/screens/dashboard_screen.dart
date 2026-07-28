import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_widgets.dart';
import '../widgets/stat_card.dart';

class DashboardScreen extends StatelessWidget {
  final Function(int) onNavigate;

  const DashboardScreen({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final ds = DataService();
    final user = ds.currentUser;
    final patients = ds.patients;
    final checklists = ds.checklists;
    final inventory = ds.inventory;
    final tasks = ds.tasks;

    final icuCount = patients.where((p) => p.status == 'ICU').length;
    final pendingChecklists = checklists.where((c) => !c.isCompleted).length;
    final lowStockCount = inventory.where((i) => i.isLowStock).length;
    final openTasks = tasks.where((t) => t.status != 'Completed').length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryBlue.withOpacity(0.25),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.white24,
                  child: Text(
                    (user?.fullName.isNotEmpty ?? false) ? user!.fullName[0] : 'A',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome back, ${user?.fullName ?? "Administrator"}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Role: ${user?.role.toUpperCase() ?? "ADMIN"} | ${user?.department ?? "Clinical Operations"}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stat Cards Grid
          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              StatCard(
                title: 'Total Patients',
                value: '${patients.length}',
                subtitle: '$icuCount in ICU Ward',
                icon: Icons.hotel_rounded,
                gradientColors: const [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                onTap: () => onNavigate(1),
              ),
              StatCard(
                title: 'Pending Checklists',
                value: '$pendingChecklists',
                subtitle: '${checklists.length - pendingChecklists} Completed today',
                icon: Icons.checklist_rounded,
                gradientColors: const [Color(0xFF10B981), Color(0xFF047857)],
                onTap: () => onNavigate(2),
              ),
              StatCard(
                title: 'Low Stock Alerts',
                value: '$lowStockCount',
                subtitle: 'Items below threshold',
                icon: Icons.warning_amber_rounded,
                gradientColors: const [Color(0xFFF59E0B), Color(0xFFD97706)],
                onTap: () => onNavigate(3),
              ),
              StatCard(
                title: 'Open Tasks',
                value: '$openTasks',
                subtitle: 'Assigned across depts',
                icon: Icons.assignment_rounded,
                gradientColors: const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                onTap: () => onNavigate(4),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Quick Action Chips
          const Text(
            'Quick Actions',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildActionButton(
                  context,
                  icon: Icons.person_add_rounded,
                  label: 'Admit Patient',
                  color: AppTheme.primaryLight,
                  onTap: () => onNavigate(1),
                ),
                const SizedBox(width: 8),
                _buildActionButton(
                  context,
                  icon: Icons.add_task_rounded,
                  label: 'Add Checklist',
                  color: AppTheme.successGreen,
                  onTap: () => onNavigate(2),
                ),
                const SizedBox(width: 8),
                _buildActionButton(
                  context,
                  icon: Icons.inventory_2_rounded,
                  label: 'Stock Request',
                  color: AppTheme.warningAmber,
                  onTap: () => onNavigate(3),
                ),
                const SizedBox(width: 8),
                _buildActionButton(
                  context,
                  icon: Icons.report_problem_rounded,
                  label: 'Log Complaint',
                  color: AppTheme.dangerRed,
                  onTap: () => onNavigate(4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Recent Patients Section
          SectionHeader(
            title: 'Recent Patient Admissions',
            actionText: 'View All (${patients.length})',
            onAction: () => onNavigate(1),
          ),
          ListView.builder(
            itemCount: patients.take(3).length,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemBuilder: (context, index) {
              final p = patients[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primaryBlue.withOpacity(0.1),
                    child: Text(
                      p.name[0],
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  ),
                  title: Text(
                    p.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text('${p.ward} • Room ${p.roomNumber}'),
                  trailing: StatusBadge.fromStatus(p.status),
                ),
              );
            },
          ),
          const SizedBox(height: 20),

          // Activity Logs
          const SectionHeader(title: 'Recent System Activities'),
          ListView.builder(
            itemCount: ds.logs.take(3).length,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemBuilder: (context, index) {
              final log = ds.logs[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.history_rounded, color: AppTheme.textSecondary),
                  title: Text(log.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: Text(log.subtitle, style: const TextStyle(fontSize: 12)),
                  trailing: Text(log.timestamp, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ActionChip(
      avatar: Icon(icon, color: color, size: 18),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      backgroundColor: color.withOpacity(0.08),
      side: BorderSide(color: color.withOpacity(0.3)),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      onPressed: onTap,
    );
  }
}
