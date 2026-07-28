import 'package:flutter/material.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final ds = DataService();
    final user = ds.currentUser;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // User Profile Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: AppTheme.primaryBlue,
                  child: Text(
                    (user?.fullName.isNotEmpty ?? false) ? user!.fullName[0] : 'U',
                    style: const TextStyle(fontSize: 26, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.fullName ?? 'Hospital User',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Role: ${user?.role.toUpperCase()} • ${user?.department}',
                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Preferences Section
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Text(
            'App Preferences',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
          ),
        ),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Dark Mode Theme'),
                subtitle: const Text('Switch between Light and Dark visual modes'),
                secondary: const Icon(Icons.dark_mode_rounded),
                value: ds.isDarkMode,
                onChanged: (val) {
                  ds.toggleDarkMode();
                  setState(() {});
                },
              ),
              const Divider(height: 1),
              const ListTile(
                leading: Icon(Icons.language_rounded),
                title: Text('Language'),
                subtitle: Text('English (US)'),
                trailing: Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // System Info Section
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Text(
            'System & Synchronization',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
          ),
        ),
        Card(
          child: Column(
            children: [
              const ListTile(
                leading: Icon(Icons.sync_rounded, color: AppTheme.successGreen),
                title: Text('Cloud Data Sync Status'),
                subtitle: Text('Connected to Firebase Realtime DB'),
                trailing: Icon(Icons.check_circle, color: AppTheme.successGreen),
              ),
              const Divider(height: 1),
              const ListTile(
                leading: Icon(Icons.info_outline_rounded),
                title: Text('App Version'),
                subtitle: Text('Stavya Intelligence HMS v1.0.0'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Logout Button
        ElevatedButton.icon(
          onPressed: () {
            ds.logout();
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
          icon: const Icon(Icons.logout_rounded),
          label: const Text('LOGOUT FROM PORTAL'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.dangerRed,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ],
    );
  }
}
