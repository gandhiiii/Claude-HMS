import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  bool _onlyLowStock = false;
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final ds = DataService();
    final items = ds.inventory;

    final filteredItems = items.where((item) {
      final matchesSearch = item.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          item.category.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesLowStock = !_onlyLowStock || item.isLowStock;
      return matchesSearch && matchesLowStock;
    }).toList();

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Search & Filter Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: const InputDecoration(
                      hintText: 'Search stock items...',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilterChip(
                  label: const Text('Low Stock Only'),
                  selected: _onlyLowStock,
                  selectedColor: AppTheme.warningAmber.withOpacity(0.2),
                  onSelected: (val) => setState(() => _onlyLowStock = val),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Inventory List
            Expanded(
              child: ListView.builder(
                itemCount: filteredItems.length,
                itemBuilder: (context, index) {
                  final item = filteredItems[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: (item.isLowStock ? AppTheme.warningAmber : AppTheme.primaryLight).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          item.category == 'Medicine'
                              ? Icons.medication_rounded
                              : item.category == 'Consumable'
                                  ? Icons.healing_rounded
                                  : Icons.medical_services_rounded,
                          color: item.isLowStock ? AppTheme.warningAmber : AppTheme.primaryLight,
                        ),
                      ),
                      title: Text(
                        item.name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text('Category: ${item.category} • Min Reorder Level: ${item.minThreshold} ${item.unit}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${item.stockQuantity} ${item.unit}',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: item.isLowStock ? AppTheme.dangerRed : AppTheme.successGreen,
                            ),
                          ),
                          if (item.isLowStock)
                            const Text(
                              'LOW STOCK',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.dangerRed,
                              ),
                            ),
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
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Material Requisition submitted to Storekeeper.')),
          );
        },
        icon: const Icon(Icons.add_shopping_cart),
        label: const Text('New Stock Request'),
        backgroundColor: AppTheme.secondaryTeal,
        foregroundColor: Colors.white,
      ),
    );
  }
}
