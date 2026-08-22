import * as XLSX from 'xlsx';

/**
 * Generates and triggers download of formatted Excel report for hospital discount requests.
 */
export const exportToExcel = (requests, users, filterTitle = 'All Records') => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate totals
  const totalBillSum = requests.reduce((acc, r) => acc + Number(r.totalBillAmount || 0), 0);
  const totalDiscountSum = requests.reduce((acc, r) => acc + Number(r.calculatedDiscountAmount || 0), 0);
  const totalPayableSum = requests.reduce((acc, r) => acc + Number(r.finalPayableAmount || 0), 0);
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  // Header summary block
  const summaryData = [
    ['CAREPULSE HOSPITAL - BILLING DISCOUNT AUTHORIZATION REPORT'],
    ['Generated On:', currentDate],
    ['Filter Applied:', filterTitle],
    ['Total Requests:', requests.length],
    ['Approved Requests:', approvedCount],
    ['Pending Approvals:', pendingCount],
    ['Rejected Requests:', rejectedCount],
    ['Total Bill Amount:', `₹${totalBillSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Total Discount Granted:', `₹${totalDiscountSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Net Payable Revenue:', `₹${totalPayableSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    [] // Empty row spacer
  ];

  // Table columns definition
  const tableHeaders = [
    'Request Code',
    'Date & Time',
    'Receipt No',
    'Bill / Receipt Date',
    'OPD / IPD No',
    'Patient ID',
    'Patient Name',
    'Patient / Relative Name',
    'Age / Gender',
    'Department',
    'Hospital Service',
    'Treating Doctor',
    'Staff / Reference Name',
    'Particulars',
    'Total Bill (₹)',
    'Discount Type',
    'Requested % / Value',
    'Discount Amount (₹)',
    'Net Payable (₹)',
    'Reason Category',
    'Detailed Justification',
    'Requested By',
    'Required Authority Tier',
    'Assigned Approver',
    'Status',
    'Approver Remarks',
    'Approved / Rejected By',
    'Action Timestamp'
  ];

  const tableRows = requests.map(req => {
    const approverUser = users.find(u => u.id === req.assignedApproverId || u.role === req.requiredAuthorityRole);
    return [
      req.requestCode,
      req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A',
      req.receiptNo || 'N/A',
      req.billDate || 'N/A',
      req.opdIpdNo || 'N/A',
      req.patientId,
      req.patientName,
      req.relativeName || req.patientName || 'N/A',
      `${req.patientAge || 'N/A'} / ${req.patientGender || 'N/A'}`,
      req.department,
      req.serviceName || 'Consultation Fees',
      req.doctorName,
      req.referenceName || req.doctorName || 'N/A',
      req.particulars || 'N/A',
      Number(req.totalBillAmount || 0),
      req.requestedDiscountType || 'PERCENTAGE',
      req.requestedDiscountType === 'PERCENTAGE' ? `${req.requestedDiscountVal}%` : `₹${req.requestedDiscountVal}`,
      Number(req.calculatedDiscountAmount || 0),
      Number(req.finalPayableAmount || 0),
      req.reasonCategory,
      req.detailedReason,
      req.requestedBy,
      req.requiredAuthorityRole,
      approverUser ? `${approverUser.name} (${approverUser.role})` : req.requiredAuthorityRole,
      req.status,
      req.approverComments || '-',
      req.approvedBy || '-',
      req.approvalTimestamp ? new Date(req.approvalTimestamp).toLocaleString() : '-'
    ];
  });

  // Combine summary and tabular data
  const fullWorksheetData = [
    ...summaryData,
    tableHeaders,
    ...tableRows,
    [],
    ['TOTALS', '', '', '', '', '', '', totalBillSum, '', '', totalDiscountSum, totalPayableSum]
  ];

  // Create sheet
  const worksheet = XLSX.utils.aoa_to_sheet(fullWorksheetData);

  // Set custom column widths for optimum readability
  worksheet['!cols'] = [
    { wch: 14 }, // Code
    { wch: 18 }, // Date
    { wch: 12 }, // Patient ID
    { wch: 20 }, // Patient Name
    { wch: 12 }, // Age/Gender
    { wch: 16 }, // Department
    { wch: 18 }, // Doctor
    { wch: 14 }, // Total Bill
    { wch: 14 }, // Type
    { wch: 14 }, // Requested Val
    { wch: 16 }, // Discount Amount
    { wch: 14 }, // Net Payable
    { wch: 24 }, // Reason Category
    { wch: 35 }, // Justification
    { wch: 18 }, // Requested By
    { wch: 20 }, // Required Authority
    { wch: 24 }, // Approver
    { wch: 12 }, // Status
    { wch: 30 }, // Remarks
    { wch: 20 }, // Approved By
    { wch: 18 }  // Timestamp
  ];

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Discount Authorization Audit');

  // Trigger download
  const filename = `Hospital_Discount_Report_${filterTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
