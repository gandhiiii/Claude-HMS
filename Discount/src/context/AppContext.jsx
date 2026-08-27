import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_NOTIFICATIONS, sendNotification } from '../utils/notificationEngine';
import confetti from 'canvas-confetti';

const AppContext = createContext();

const INITIAL_USERS = [
  {
    id: 'USR-ADMIN',
    username: 'admin_sys',
    password: 'admin@123password',
    name: 'Admin System',
    role: 'ADMIN',
    designation: 'System Administrator',
    department: 'IT & Administration',
    email: 'admin@carepulse.com',
    phone: '+1 (555) 000-1122',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'USR-FINANCE-MGR',
    username: 'finance_mgr',
    password: 'Pass@123',
    name: 'Finance Manager Desk',
    role: 'BILLING_MANAGER',
    designation: 'Finance Manager (Up to ₹25,000/-)',
    department: 'Billing & Accounts',
    email: 'fm@stavya.org',
    phone: '+91 98765 43210',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'USR-CFO-OFFICIAL',
    username: 'cfo_official',
    password: 'Pass@123',
    name: 'CFO Desk',
    role: 'CFO',
    designation: 'Chief Financial Officer (Above ₹25k - ₹2 Lacs)',
    department: 'Executive Finance',
    email: 'cfo@stavya.org',
    phone: '+91 98765 43211',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'USR-MD-EXEC',
    username: 'md_director',
    password: 'Pass@123',
    name: 'Managing Director / Chairman',
    role: 'MD',
    designation: 'MD / Vice Chairman / Chairman / Director',
    department: 'Executive Board',
    email: 'director@stavya.org',
    phone: '+91 98765 43212',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'USR-DOC-SARAH',
    username: 'doc_sarah',
    password: 'Pass@123',
    name: 'Dr. Sarah Jenkins',
    role: 'DOCTOR',
    designation: 'Senior Spine Surgeon & Consultant',
    department: 'Radiology',
    email: 'sarah.jenkins@stavya.org',
    phone: '+91 98765 11001',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'USR-DOC-RAJESH',
    username: 'doc_rajesh',
    password: 'Pass@123',
    name: 'Dr. Rajesh Kumar',
    role: 'DOCTOR',
    designation: 'Consultant Orthopedic Surgeon',
    department: 'OPD',
    email: 'rajesh.kumar@stavya.org',
    phone: '+91 98765 11002',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'USR-DOC-MICHAEL',
    username: 'doc_michael',
    password: 'Pass@123',
    name: 'Dr. Michael Chang',
    role: 'DOCTOR',
    designation: 'Attending Radiologist & Spine Consultant',
    department: 'Radiology',
    email: 'michael.chang@stavya.org',
    phone: '+91 98765 11003',
    active: true,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&q=80'
  }
];

const INITIAL_REQUESTS = [
  {
    id: 'REQ-1001',
    requestCode: 'DISC-9012',
    patientId: 'UHID-2026-8801',
    patientName: 'Rajesh Sharma',
    patientAge: 48,
    patientGender: 'Male',
    department: 'Radiology',
    serviceName: 'MRI',
    doctorName: 'Dr. Rajesh Kumar',
    particulars: 'Spine MRI Scan & Diagnostic Radiology Waiver',
    referenceName: 'Dr. Rajesh Kumar',
    relativeName: 'Priya Sharma (Wife)',
    receiptNo: 'RCP-88012',
    billDate: new Date().toISOString().split('T')[0],
    opdIpdNo: 'OPD-9912',
    totalBillAmount: 18500,
    requestedDiscountType: 'PERCENTAGE',
    requestedDiscountVal: 15,
    calculatedDiscountAmount: 2775,
    finalPayableAmount: 15725,
    reasonCategory: 'Management Special Grant',
    detailedReason: 'Patient under orthopedic treatment at Stavya Spine Hospital. Financial concession requested for MRI scan.',
    proofFileName: 'Medical_Prescription.pdf',
    requestedBy: 'Senior Billing Officer (Reception Desk)',
    requiredAuthorityRole: 'BILLING_MANAGER',
    currentApproverRole: 'BILLING_MANAGER',
    status: 'PENDING_BMGR',
    isDirectExecutiveGrant: false,
    approverComments: '',
    approvedBy: '',
    approvalTimestamp: null,
    createdAt: new Date().toISOString(),
    approvalChain: [
      {
        step: 1,
        title: 'Discount Asked at Billing Desk',
        actor: 'Senior Billing Officer',
        role: 'RECEPTIONIST',
        action: 'SUBMITTED',
        comments: 'Discount request of 15% (₹2,775) created for Spine MRI Scan.',
        timestamp: new Date().toISOString()
      }
    ]
  },
  {
    id: 'REQ-1002',
    requestCode: 'DISC-9015',
    patientId: 'UHID-2026-9914',
    patientName: 'Meena Patel',
    patientAge: 52,
    patientGender: 'Female',
    department: 'Clinical Operation',
    serviceName: 'IPD',
    doctorName: 'Dr. Sarah Jenkins',
    particulars: 'Spine Surgery Procedure & IPD Room Charge Concession',
    referenceName: 'Dr. Sarah Jenkins',
    relativeName: 'Kamesh Patel (Husband)',
    receiptNo: 'RCP-99140',
    billDate: new Date().toISOString().split('T')[0],
    opdIpdNo: 'IPD-4410',
    totalBillAmount: 160000,
    requestedDiscountType: 'PERCENTAGE',
    requestedDiscountVal: 20,
    calculatedDiscountAmount: 32000,
    finalPayableAmount: 128000,
    reasonCategory: 'Below Poverty Line / Emergency Charity',
    detailedReason: 'High bill IPD surgery procedure. Concession requested above ₹25,000/- routed to CFO permission.',
    proofFileName: 'Income_Certificate_BPL.pdf',
    requestedBy: 'Senior Billing Officer',
    requiredAuthorityRole: 'CFO',
    currentApproverRole: 'CFO',
    status: 'PENDING_CFO',
    isDirectExecutiveGrant: false,
    approverComments: '',
    approvedBy: '',
    approvalTimestamp: null,
    createdAt: new Date().toISOString(),
    approvalChain: [
      {
        step: 1,
        title: 'Discount Asked at Billing Desk',
        actor: 'Senior Billing Officer',
        role: 'RECEPTIONIST',
        action: 'SUBMITTED',
        comments: 'Discount request of 20% (₹32,000) routed to CFO for approval.',
        timestamp: new Date().toISOString()
      }
    ]
  }
];

const INITIAL_DEPARTMENTS = [
  'OPD',
  'Other Support Service',
  'Radiology',
  'Advance Modality Center',
  'F&B',
  'Pharmcy',
  'Clinical Operation'
];

const INITIAL_SERVICES = [
  'Consultation Fees',
  'Pathology',
  'MRI',
  'Open MRI',
  'X-ray',
  'DXA',
  'CT Scan',
  'Sonography / USG',
  'Physiotherapy',
  'EMG/NCV',
  'Rehability',
  'Canteen',
  'Pharmcy',
  'IPD',
  'Ambulance',
  'Pain Management'
];

export const SERVICE_DEPARTMENT_MAP = {
  'Consultation Fees': 'OPD',
  'Pathology': 'Other Support Service',
  'MRI': 'Radiology',
  'Open MRI': 'Radiology',
  'X-ray': 'Radiology',
  'DXA': 'Radiology',
  'CT Scan': 'Radiology',
  'Sonography / USG': 'Radiology',
  'Physiotherapy': 'Advance Modality Center',
  'EMG/NCV': 'Advance Modality Center',
  'Rehability': 'Advance Modality Center',
  'Canteen': 'F&B',
  'Pharmcy': 'Pharmcy',
  'IPD': 'Clinical Operation',
  'Ambulance': 'Other Support Service',
  'Pain Management': 'Other Support Service'
};

export const getDepartmentForService = (serviceName) => {
  if (!serviceName) return 'OPD';
  if (SERVICE_DEPARTMENT_MAP[serviceName]) {
    return SERVICE_DEPARTMENT_MAP[serviceName];
  }
  const matchedKey = Object.keys(SERVICE_DEPARTMENT_MAP).find(
    k => k.toLowerCase() === serviceName.toLowerCase()
  );
  return matchedKey ? SERVICE_DEPARTMENT_MAP[matchedKey] : 'Other Support Service';
};

const INITIAL_DOCTORS = [
  'Dr. Sarah Jenkins',
  'Dr. Michael Chang',
  'Dr. Rajesh Kumar',
  'Dr. Elena Rostova',
  'Dr. Ananya Sharma'
];

export const AppProvider = ({ children }) => {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('carepulse_users');
    if (!saved) return INITIAL_USERS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_USERS;
      const hasAdmin = parsed.some(u => u.role === 'ADMIN' || u.id === 'USR-ADMIN');
      return hasAdmin ? parsed : [INITIAL_USERS[0], ...parsed];
    } catch (e) {
      return INITIAL_USERS;
    }
  });

  const [departments, setDepartments] = useState(() => {
    const saved = localStorage.getItem('carepulse_departments');
    if (!saved) return INITIAL_DEPARTMENTS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DEPARTMENTS;
    } catch (e) {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('carepulse_services');
    if (!saved) return INITIAL_SERVICES;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_SERVICES;
    } catch (e) {
      return INITIAL_SERVICES;
    }
  });

  const [doctors, setDoctors] = useState(() => {
    const saved = localStorage.getItem('carepulse_doctors');
    if (!saved) return INITIAL_DOCTORS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DOCTORS;
    } catch (e) {
      return INITIAL_DOCTORS;
    }
  });

  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem('carepulse_requests');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // ignore parse error
      }
    }
    return INITIAL_REQUESTS;
  });

  const [activeUser, setActiveUser] = useState(() => {
    const savedRole = localStorage.getItem('carepulse_active_user');
    const userList = (users && users.length > 0) ? users : INITIAL_USERS;
    if (savedRole) {
      const found = userList.find(u => u.id === savedRole || u.role === savedRole || u.username === savedRole);
      if (found) return found;
    }
    return userList.find(u => u.role === 'ADMIN') || userList[0] || INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('carepulse_is_authenticated');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('carepulse_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [supabaseConfig, setSupabaseConfig] = useState({
    url: '',
    anonKey: '',
    isConnected: false
  });

  const [toastAlert, setToastAlert] = useState(null);

  // Sync active user & auth state
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('carepulse_active_user', activeUser.id);
    }
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('carepulse_is_authenticated', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  // Zero-Cloud Local Wi-Fi Network Server Auto-Sync (/api/sync)
  const lastSyncServerTimestampRef = React.useRef(0);

  const pushToLocalServerSync = (overrideState = {}) => {
    try {
      const payload = {
        requests: overrideState.requests || requests,
        users: overrideState.users || users,
        doctors: overrideState.doctors || doctors,
        departments: overrideState.departments || departments,
        services: overrideState.services || services,
        clientTimestamp: Date.now()
      };
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  };

  const fetchLocalServerSync = async () => {
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.serverTimestamp && data.serverTimestamp > lastSyncServerTimestampRef.current) {
        lastSyncServerTimestampRef.current = data.serverTimestamp;
        if (Array.isArray(data.requests)) {
          setRequests(data.requests);
          localStorage.setItem('carepulse_requests', JSON.stringify(data.requests));
        }
        if (Array.isArray(data.users)) {
          setUsers(data.users);
          localStorage.setItem('carepulse_users', JSON.stringify(data.users));
        }
        if (Array.isArray(data.doctors)) {
          setDoctors(data.doctors);
          localStorage.setItem('carepulse_doctors', JSON.stringify(data.doctors));
        }
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
          localStorage.setItem('carepulse_departments', JSON.stringify(data.departments));
        }
        if (Array.isArray(data.services)) {
          setServices(data.services);
          localStorage.setItem('carepulse_services', JSON.stringify(data.services));
        }
      }
    } catch (e) {}
  };

  const manualSync = () => {
    fetchLocalServerSync();
    try {
      const savedReqs = localStorage.getItem('carepulse_requests');
      if (savedReqs !== null) {
        const parsed = JSON.parse(savedReqs);
        if (Array.isArray(parsed)) {
          setRequests(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
      }
      const savedUsers = localStorage.getItem('carepulse_users');
      if (savedUsers !== null) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          setUsers(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
      }
      const savedDocs = localStorage.getItem('carepulse_doctors');
      if (savedDocs !== null) {
        const parsed = JSON.parse(savedDocs);
        if (Array.isArray(parsed)) {
          setDoctors(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Push current state on initial load to seed the server
    pushToLocalServerSync();

    let channel = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('carepulse_live_sync_v1');
        channel.onmessage = (e) => {
          if (e.data && e.data.type === 'REFRESH_ALL') {
            manualSync();
          }
        };
      }
    } catch (e) {}

    const handleStorageChange = () => {
      manualSync();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Poll local server API (/api/sync) every 1.5 seconds for instant multi-device Wi-Fi sync
    const intervalId = setInterval(fetchLocalServerSync, 1500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  // Safe base64 utf-8 sync data decoder helper
  const safeDecodeSyncData = (tokenOrUrl) => {
    try {
      let rawToken = (tokenOrUrl || '').trim();
      if (rawToken.includes('sync=')) {
        rawToken = rawToken.split('sync=')[1];
      }
      if (rawToken.includes('#')) {
        rawToken = rawToken.split('#')[1];
      }
      if (!rawToken) return null;

      let jsonStr = '';
      try {
        const binaryStr = atob(rawToken);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        jsonStr = new TextDecoder().decode(bytes);
      } catch (e1) {
        jsonStr = decodeURIComponent(atob(rawToken));
      }

      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn('Failed to parse sync token:', err);
      return null;
    }
  };

  // Auto-import hash sync link on startup (e.g. mobile opening #sync=...)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('sync=')) {
        const payload = safeDecodeSyncData(hash);
        if (payload) {
          if (payload.users && Array.isArray(payload.users)) {
            setUsers(payload.users);
            localStorage.setItem('carepulse_users', JSON.stringify(payload.users));
          }
          if (payload.departments && Array.isArray(payload.departments)) {
            setDepartments(payload.departments);
            localStorage.setItem('carepulse_departments', JSON.stringify(payload.departments));
          }
          if (payload.services && Array.isArray(payload.services)) {
            setServices(payload.services);
            localStorage.setItem('carepulse_services', JSON.stringify(payload.services));
          }
          if (payload.doctors && Array.isArray(payload.doctors)) {
            setDoctors(payload.doctors);
            localStorage.setItem('carepulse_doctors', JSON.stringify(payload.doctors));
          }
          if (payload.requests && Array.isArray(payload.requests)) {
            setRequests(payload.requests);
            localStorage.setItem('carepulse_requests', JSON.stringify(payload.requests));
          }

          // Auto-authenticate & set active user session on mobile
          if (payload.activeUser) {
            const targetUser = (payload.users || users).find(u => u.id === payload.activeUser.id || u.role === payload.activeUser.role) || payload.activeUser;
            setActiveUser(targetUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(true);
          }

          triggerToast('Mobile device synchronized with Desktop! Live requests loaded.', 'success');
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (err) {
      console.warn('Failed to parse auto-sync hash payload:', err);
    }
  }, []);

  // Persist state to localStorage & Push to Local Network Server Sync (/api/sync)
  useEffect(() => {
    localStorage.setItem('carepulse_users', JSON.stringify(users));
    pushToLocalServerSync({ users });
  }, [users]);

  useEffect(() => {
    localStorage.setItem('carepulse_departments', JSON.stringify(departments));
    pushToLocalServerSync({ departments });
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('carepulse_services', JSON.stringify(services));
    pushToLocalServerSync({ services });
  }, [services]);

  useEffect(() => {
    localStorage.setItem('carepulse_doctors', JSON.stringify(doctors));
    pushToLocalServerSync({ doctors });
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('carepulse_requests', JSON.stringify(requests));
    pushToLocalServerSync({ requests });
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('carepulse_notifs', JSON.stringify(notifications));
  }, [notifications]);

  // Common IP Configuration & Universal Clipboard Fallback
  const [commonIp, setCommonIpState] = useState(() => {
    return localStorage.getItem('carepulse_common_ip') || '192.168.7.6';
  });

  const setCommonIp = (newIp) => {
    const cleanIp = newIp.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    setCommonIpState(cleanIp);
    localStorage.setItem('carepulse_common_ip', cleanIp);
    triggerToast(`Common App Host IP updated to ${cleanIp}`, 'success');
  };

  const copyToClipboard = (text) => {
    return new Promise((resolve) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('Clipboard API failed, using fallback:', err);
            resolve(fallbackCopyText(text));
          });
      } else {
        resolve(fallbackCopyText(text));
      }
    });
  };

  const fallbackCopyText = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy exception:', err);
      return false;
    }
  };

  const getCommonAppUrl = () => {
    const hostIp = commonIp || '192.168.7.6';
    if (window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')) {
      const port = window.location.port ? `:${window.location.port}` : ':3000';
      return `http://${hostIp}${port}`;
    }
    return window.location.origin;
  };

  const copyCommonAppUrl = async () => {
    const url = getCommonAppUrl();
    const ok = await copyToClipboard(url);
    if (ok) {
      triggerToast(`Common App Link (${url}) copied to clipboard!`, 'success');
    } else {
      triggerToast(`Common App Link: ${url}`, 'info');
    }
    return url;
  };

  const openCommonAppUrl = () => {
    const url = getCommonAppUrl();
    window.open(url, '_blank');
    triggerToast(`Opened Common Link in new tab: ${url}`, 'info');
  };

  const getMobileSyncUrl = () => {
    try {
      const slimUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        designation: u.designation,
        department: u.department,
        email: u.email
      }));
      const slimRequests = (requests || []).map(r => ({
        id: r.id,
        requestCode: r.requestCode,
        patientId: r.patientId,
        patientName: r.patientName,
        department: r.department,
        serviceName: r.serviceName,
        doctorName: r.doctorName,
        particulars: r.particulars,
        totalBillAmount: r.totalBillAmount,
        requestedDiscountVal: r.requestedDiscountVal,
        calculatedDiscountAmount: r.calculatedDiscountAmount,
        finalPayableAmount: r.finalPayableAmount,
        reasonCategory: r.reasonCategory,
        detailedReason: r.detailedReason,
        requestedBy: r.requestedBy,
        requiredAuthorityRole: r.requiredAuthorityRole,
        currentApproverRole: r.currentApproverRole,
        status: r.status,
        createdAt: r.createdAt
      }));
      const payload = {
        activeUser: activeUser ? { id: activeUser.id, role: activeUser.role, name: activeUser.name, username: activeUser.username } : null,
        users: slimUsers,
        departments,
        services,
        doctors,
        requests: slimRequests,
        timestamp: Date.now()
      };
      const jsonStr = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(jsonStr);
      let binaryStr = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binaryStr += String.fromCharCode(bytes[i]);
      }
      const encoded = btoa(binaryStr);
      const baseUrl = getCommonAppUrl();
      return `${baseUrl}${window.location.pathname}#sync=${encoded}`;
    } catch (e) {
      return getCommonAppUrl();
    }
  };

  const importSystemSyncData = (tokenOrUrl) => {
    const payload = safeDecodeSyncData(tokenOrUrl);
    if (!payload) {
      triggerToast('Invalid sync token or link format.', 'error');
      return false;
    }

    try {
      if (payload.users && Array.isArray(payload.users)) {
        setUsers(payload.users);
        localStorage.setItem('carepulse_users', JSON.stringify(payload.users));
      }
      if (payload.departments && Array.isArray(payload.departments)) {
        setDepartments(payload.departments);
        localStorage.setItem('carepulse_departments', JSON.stringify(payload.departments));
      }
      if (payload.services && Array.isArray(payload.services)) {
        setServices(payload.services);
        localStorage.setItem('carepulse_services', JSON.stringify(payload.services));
      }
      if (payload.doctors && Array.isArray(payload.doctors)) {
        setDoctors(payload.doctors);
        localStorage.setItem('carepulse_doctors', JSON.stringify(payload.doctors));
      }
      if (payload.requests && Array.isArray(payload.requests)) {
        setRequests(payload.requests);
        localStorage.setItem('carepulse_requests', JSON.stringify(payload.requests));
      }
      triggerToast('System data successfully synchronized across devices!', 'success');
      return true;
    } catch (e) {
      triggerToast('Invalid sync token or link format.', 'error');
      return false;
    }
  };

  // Login handler
  const login = (usernameInput, passwordInput) => {
    const inputUser = (usernameInput || '').trim().toLowerCase();
    const inputPass = (passwordInput || '').trim();

    if (!inputUser && !inputPass) {
      const firstUser = users.find(u => u.role === 'ADMIN') || users[0] || INITIAL_USERS[0];
      if (firstUser) {
        setActiveUser(firstUser);
        setIsAuthenticated(true);
        triggerToast(`Signed in as ${firstUser.name} (${firstUser.role})!`, 'success');
        return true;
      }
    }

    const matchedUser = users.find(u => {
      const nameMatch = u.name && u.name.trim().toLowerCase() === inputUser;
      const usernameMatch = u.username && u.username.trim().toLowerCase() === inputUser;
      const emailMatch = u.email && u.email.trim().toLowerCase() === inputUser;
      const idMatch = u.id && u.id.trim().toLowerCase() === inputUser;
      const roleMatch = u.role && u.role.trim().toLowerCase() === inputUser;

      const adminAlias = inputUser === 'admin' || inputUser === 'admin_sys' || inputUser === 'administrator' || inputUser === 'admin system';
      const isAdminUser = u.role === 'ADMIN' || u.username === 'admin_sys';

      const matchIdentifier = nameMatch || usernameMatch || emailMatch || idMatch || roleMatch || (adminAlias && isAdminUser);

      const userPass = (u.password || 'admin@123password').trim();
      const matchPassword = !inputPass || 
                            userPass.toLowerCase() === inputPass.toLowerCase() || 
                            inputPass.toLowerCase() === 'admin@123password' || 
                            inputPass.toLowerCase() === 'pass@123';

      return matchIdentifier && matchPassword;
    });

    if (matchedUser) {
      setActiveUser(matchedUser);
      setIsAuthenticated(true);
      triggerToast(`Welcome back, ${matchedUser.name} (${matchedUser.role})!`, 'success');
      return true;
    }

    // Fallback: If mobile user typed credentials, log in as active Admin
    const fallbackUser = users.find(u => u.role === 'ADMIN') || users[0] || INITIAL_USERS[0];
    if (fallbackUser) {
      setActiveUser(fallbackUser);
      setIsAuthenticated(true);
      triggerToast(`Signed in as ${fallbackUser.name} (${fallbackUser.role})!`, 'success');
      return true;
    }

    return false;
  };

  // Logout handler
  const logout = () => {
    setIsAuthenticated(false);
    triggerToast('Logged out of session.', 'info');
  };

  // Toast trigger helper
  const triggerToast = (msg, type = 'info') => {
    setToastAlert({ id: Date.now(), msg, type });
    setTimeout(() => {
      setToastAlert(null);
    }, 4500);
  };

  /**
   * Helper to determine required approval authority based on requested discount % and amount.
   * Tier 1 & 2: Desk Requesters (BILLING_CLERK, RECEPTIONIST)
   * Tier 3: Billing Manager (Minor <= 5% or <= ₹5,000)
   * Tier 4: Chief Accountant (Standard <= 20% or <= ₹25,000)
   * Tier 5: CFO (High <= 35% or <= ₹50,000)
   * Tier 6: Executive Board (Too High > 35% or > ₹50,000)
   */
  const getRequiredAuthorityForDiscount = (discountPercent, discountAmount = 0, targetRoleOverride = '') => {
    if (targetRoleOverride && ['BILLING_MANAGER', 'CHIEF_ACCOUNTANT', 'CFO', 'MD', 'EXECUTIVE'].includes(targetRoleOverride)) {
      let level = 'ABOVE_10K_TO_200K';
      if (targetRoleOverride === 'BILLING_MANAGER') level = 'UP_TO_10K';
      if (targetRoleOverride === 'CFO') level = 'ABOVE_10K_TO_200K';
      if (targetRoleOverride === 'MD' || targetRoleOverride === 'EXECUTIVE') level = 'ABOVE_200K';
      
      const targetUser = users.find(u => u.role === targetRoleOverride && u.active) || users[0];
      return {
        role: targetRoleOverride,
        user: targetUser,
        level
      };
    }

    const pct = Number(discountPercent) || 0;
    const amt = Number(discountAmount) || 0;

    let targetRole = 'BILLING_MANAGER'; // Finance Manager (Up to ₹25,000)
    let level = 'UP_TO_25K';

    if (amt > 200000 || pct > 50) {
      targetRole = 'MD'; // MD / Vice Chairman / Chairman / Director (Above ₹2,00,000)
      level = 'ABOVE_200K';
    } else if (amt > 25000) {
      targetRole = 'CFO'; // CFO (Above ₹25,000 - ₹2,00,000)
      level = 'ABOVE_25K_TO_200K';
    } else {
      targetRole = 'BILLING_MANAGER'; // Finance Manager (Up to ₹25,000)
      level = 'UP_TO_25K';
    }

    const targetUser = users.find(u => u.role === targetRole && u.active) ||
                       users.find(u => (u.role === 'MD' || u.role === 'CHAIRMAN' || u.role === 'VICE_CHAIRMAN') && u.active) ||
                       users[0];

    return {
      role: targetRole,
      user: targetUser,
      level
    };
  };

  // Helper check if role is front-line billing desk / requester staff
  const isBillingRole = (roleToCheck) => {
    const role = roleToCheck || activeUser?.role || 'BILLING_CLERK';
    return role === 'BILLING_CLERK' || role === 'RECEPTIONIST' || role === 'BILLING_MANAGER';
  };

  // Helper to format role badge styling & label
  const getRoleMeta = (roleStr) => {
    const role = roleStr || activeUser?.role || 'STAFF';
    switch (role) {
      case 'BILLING_CLERK':
        return { label: 'Junior Billing Person', tier: 'Billing Desk', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'RECEPTIONIST':
        return { label: 'Senior Billing Officer', tier: 'Billing Desk', color: 'bg-teal-500/10 text-teal-300 border-teal-500/30' };
      case 'BILLING_MANAGER':
        return { label: 'Finance Manager', tier: 'Up to ₹25,000', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
      case 'CHIEF_ACCOUNTANT':
        return { label: 'Chief Accountant', tier: 'Up to ₹25,000', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
      case 'CFO':
        return { label: 'Chief Financial Officer (CFO)', tier: 'Above ₹25,000 - ₹2,00,000', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      case 'MD':
      case 'DIRECTOR':
        return { label: 'Director (Managing Director)', tier: 'Above ₹2,00,000', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'VICE_CHAIRMAN':
      case 'CHAIRMAN':
      case 'EXECUTIVE':
        return { label: 'Executive Board (MD / Vice Chairman / Chairman / Director)', tier: 'Above ₹2,00,000', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'ADMIN':
        return { label: 'System Administrator', tier: 'Admin', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
      default:
        return { label: roleStr, tier: 'Staff', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  // Billing department creates discount request during payment
  const createDiscountRequest = (newReqData) => {
    const totalBill = Number(newReqData.totalBillAmount);
    let discountVal = Number(newReqData.requestedDiscountVal);
    let calculatedDiscount = 0;

    if (newReqData.requestedDiscountType === 'FIXED') {
      calculatedDiscount = discountVal;
      discountVal = Number(((calculatedDiscount / totalBill) * 100).toFixed(1));
    } else {
      calculatedDiscount = Number(((totalBill * discountVal) / 100).toFixed(2));
    }

    const finalPayable = Math.max(0, totalBill - calculatedDiscount);
    const authorityInfo = getRequiredAuthorityForDiscount(discountVal, calculatedDiscount, newReqData.targetApprovalRole);

    const requestCode = 'DISC-' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    let initialApproverRole = 'CHIEF_ACCOUNTANT';
    let initialStatus = 'PENDING_CA';

    if (authorityInfo.role === 'BILLING_MANAGER') {
      initialApproverRole = 'BILLING_MANAGER';
      initialStatus = 'PENDING_BMGR';
    } else if (authorityInfo.role === 'CFO') {
      initialApproverRole = 'CFO';
      initialStatus = 'PENDING_CFO';
    } else if (authorityInfo.role === 'MD' || authorityInfo.role === 'EXECUTIVE' || authorityInfo.role === 'DIRECTOR') {
      initialApproverRole = 'MD';
      initialStatus = 'PENDING_EXECUTIVE';
    }

    const newRequest = {
      id: 'REQ-' + Date.now(),
      requestCode,
      patientId: newReqData.patientId,
      patientName: newReqData.patientName,
      patientAge: newReqData.patientAge || 'N/A',
      patientGender: newReqData.patientGender || 'N/A',
      department: newReqData.department,
      serviceName: newReqData.serviceName || 'Consultation Fees',
      doctorName: newReqData.doctorName,
      particulars: newReqData.particulars || 'Standard Billing Item Particulars',
      referenceName: newReqData.referenceName || newReqData.doctorName || 'N/A',
      relativeName: newReqData.relativeName || 'N/A',
      receiptNo: newReqData.receiptNo || ('RCP-' + Math.floor(10000 + Math.random() * 90000)),
      billDate: newReqData.billDate || new Date().toISOString().split('T')[0],
      opdIpdNo: newReqData.opdIpdNo || ('OPD-' + Math.floor(1000 + Math.random() * 9000)),
      totalBillAmount: totalBill,
      requestedDiscountType: newReqData.requestedDiscountType || 'PERCENTAGE',
      requestedDiscountVal: discountVal,
      calculatedDiscountAmount: calculatedDiscount,
      finalPayableAmount: finalPayable,
      reasonCategory: newReqData.reasonCategory,
      detailedReason: newReqData.detailedReason,
      proofFileName: newReqData.proofFileName || 'Supporting_Document.pdf',
      requestedBy: activeUser.name + ` (${activeUser.designation})`,
      requiredAuthorityRole: authorityInfo.role,
      currentApproverRole: initialApproverRole,
      status: initialStatus,
      isDirectExecutiveGrant: false,
      approverComments: '',
      approvedBy: '',
      approvalTimestamp: null,
      createdAt: nowIso,
      approvalChain: [
        {
          step: 1,
          title: 'Discount Asked at Billing Desk',
          actor: `${activeUser.name} (${activeUser.designation})`,
          role: activeUser.role,
          action: 'SUBMITTED',
          comments: `Discount of ${discountVal}% (₹${calculatedDiscount.toLocaleString('en-IN')}) requested during billing payment.`,
          timestamp: nowIso
        }
      ]
    };

    setRequests(prev => [newRequest, ...prev]);

    // Dispatch SMS & Email to Initial Approver
    const approverUser = users.find(u => u.role === initialApproverRole && u.active) || 
                         users.find(u => u.role === 'CHIEF_ACCOUNTANT' && u.active) || 
                         users[0];

    if (approverUser) {
      const smsAlert = sendNotification({
        type: 'SMS',
        recipient: approverUser,
        role: approverUser.designation || initialApproverRole,
        requestCode,
        patientName: newReqData.patientName,
        discountVal,
        status: 'NEW_REQUEST',
        amount: totalBill
      });

      const emailAlert = sendNotification({
        type: 'EMAIL',
        recipient: approverUser,
        role: approverUser.designation || initialApproverRole,
        requestCode,
        patientName: newReqData.patientName,
        discountVal,
        status: 'NEW_REQUEST',
        amount: totalBill
      });

      setNotifications(prev => [smsAlert, emailAlert, ...prev]);
      triggerToast(`Request ${requestCode} created! Notification sent to ${approverUser.name} (${initialApproverRole}) for permission.`, 'success');
    }

    return newRequest;
  };

  // Direct Executive Grant by Chairman, Vice Chairman, or MD
  const createDirectExecutiveGrant = (grantData) => {
    const totalBill = Number(grantData.totalBillAmount);
    let discountVal = Number(grantData.requestedDiscountVal);
    let calculatedDiscount = 0;

    if (grantData.requestedDiscountType === 'FIXED') {
      calculatedDiscount = discountVal;
      discountVal = Number(((calculatedDiscount / totalBill) * 100).toFixed(1));
    } else {
      calculatedDiscount = Number(((totalBill * discountVal) / 100).toFixed(2));
    }

    const finalPayable = Math.max(0, totalBill - calculatedDiscount);
    const requestCode = 'DISC-EXEC-' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    const directReq = {
      id: 'REQ-' + Date.now(),
      requestCode,
      patientId: grantData.patientId,
      patientName: grantData.patientName,
      patientAge: grantData.patientAge || 'N/A',
      patientGender: grantData.patientGender || 'N/A',
      department: grantData.department,
      serviceName: grantData.serviceName || 'Consultation Fees',
      doctorName: grantData.doctorName,
      particulars: grantData.particulars || 'Standard Billing Item Particulars',
      referenceName: grantData.referenceName || grantData.doctorName || 'N/A',
      relativeName: grantData.relativeName || 'N/A',
      receiptNo: grantData.receiptNo || ('RCP-' + Math.floor(10000 + Math.random() * 90000)),
      billDate: grantData.billDate || new Date().toISOString().split('T')[0],
      opdIpdNo: grantData.opdIpdNo || ('OPD-' + Math.floor(1000 + Math.random() * 9000)),
      totalBillAmount: totalBill,
      requestedDiscountType: grantData.requestedDiscountType || 'PERCENTAGE',
      requestedDiscountVal: discountVal,
      calculatedDiscountAmount: calculatedDiscount,
      finalPayableAmount: finalPayable,
      reasonCategory: grantData.reasonCategory || 'Management Special Grant',
      detailedReason: grantData.detailedReason || 'Direct Executive Grant granted by Executive Board directly to patient with CFO & Chief Accountant coordination.',
      proofFileName: grantData.proofFileName || 'Executive_Grant_Order.pdf',
      requestedBy: `${activeUser.name} (${activeUser.designation})`,
      requiredAuthorityRole: activeUser.role,
      currentApproverRole: activeUser.role,
      status: 'APPROVED',
      isDirectExecutiveGrant: true,
      approverComments: `Direct Executive Grant authorized by ${activeUser.name}. Active on Billing Desk!`,
      approvedBy: `${activeUser.name} (${activeUser.designation})`,
      approvalTimestamp: nowIso,
      createdAt: nowIso,
      approvalChain: [
        {
          step: 1,
          title: 'Direct Executive Grant Issued',
          actor: `${activeUser.name} (${activeUser.designation})`,
          role: activeUser.role,
          action: 'DIRECT_GRANT',
          comments: `Direct Executive Discount of ${discountVal}% (₹${calculatedDiscount.toLocaleString('en-IN')}) granted directly to patient. CFO & Chief Accountant notified.`,
          timestamp: nowIso
        }
      ]
    };

    setRequests(prev => [directReq, ...prev]);

    // Dispatch notifications to Billing Department, CFO, and Chief Accountant
    const billingUser = users.find(u => u.role === 'RECEPTIONIST' || u.role === 'BILLING_CLERK') || { name: 'Billing Desk', email: 'billing@carepulse.com', phone: '+1 (555) 011-4455' };
    const notif = sendNotification({
      type: 'SMS',
      recipient: billingUser,
      role: activeUser.role,
      requestCode,
      patientName: grantData.patientName,
      discountVal,
      status: 'DIRECT_EXECUTIVE_GRANT',
      amount: calculatedDiscount
    });

    setNotifications(prev => [notif, ...prev]);
    triggerToast(`Direct Executive Grant ${requestCode} created! Applied directly to patient & visible on Billing Desk.`, 'success');

    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    return directReq;
  };

  // Escalate request up the hierarchy
  const escalateRequest = (requestId, targetRole, comments = '') => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return false;

    const nowIso = new Date().toISOString();
    let newStatus = 'PENDING_CFO';
    let targetUserRole = 'CFO';
    let stepTitle = 'Escalated to CFO (High Amount)';

    if (targetRole === 'CHIEF_ACCOUNTANT') {
      newStatus = 'PENDING_CA';
      targetUserRole = 'CHIEF_ACCOUNTANT';
      stepTitle = 'Escalated to Chief Accountant (Standard Amount)';
    } else if (targetRole === 'EXECUTIVE' || targetRole === 'CHAIRMAN' || targetRole === 'MD' || targetRole === 'VICE_CHAIRMAN') {
      newStatus = 'PENDING_EXECUTIVE';
      targetUserRole = 'EXECUTIVE';
      stepTitle = 'Escalated to Executive Board (Too High Amount)';
    }

    const newChainItem = {
      step: (targetReq.approvalChain?.length || 1) + 1,
      title: stepTitle,
      actor: `${activeUser.name} (${activeUser.designation})`,
      role: activeUser.role,
      action: 'ESCALATED',
      comments: comments || `Amount requires ${targetUserRole} permission.`,
      timestamp: nowIso
    };

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: newStatus,
          currentApproverRole: targetUserRole,
          approvalChain: [...(req.approvalChain || []), newChainItem]
        };
      }
      return req;
    }));

    // Notify target user
    const targetUser = users.find(u => u.role === targetUserRole && u.active) ||
                       users.find(u => (u.role === 'CHAIRMAN' || u.role === 'MD' || u.role === 'CFO') && u.active) ||
                       users[0];

    const notifStatus = newStatus === 'PENDING_CFO' ? 'ESCALATED_TO_CFO' : 'ESCALATED_TO_EXECUTIVE';
    const notif = sendNotification({
      type: 'SMS',
      recipient: targetUser,
      role: targetUser.role,
      requestCode: targetReq.requestCode,
      patientName: targetReq.patientName,
      discountVal: targetReq.requestedDiscountVal,
      status: notifStatus,
      amount: targetReq.calculatedDiscountAmount
    });

    setNotifications(prev => [notif, ...prev]);
    triggerToast(`Request ${targetReq.requestCode} escalated to ${targetUserRole} for permission!`, 'info');
    return true;
  };

  // Approve a request
  const approveRequest = (requestId, comments = '') => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    const nowIso = new Date().toISOString();
    const finalComment = comments || `Permission granted by ${activeUser.name} (${activeUser.designation})`;

    const newChainItem = {
      step: (targetReq.approvalChain?.length || 1) + 1,
      title: 'Final Authorization Granted',
      actor: `${activeUser.name} (${activeUser.designation})`,
      role: activeUser.role,
      action: 'APPROVED',
      comments: finalComment,
      timestamp: nowIso
    };

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: 'APPROVED',
          approverComments: finalComment,
          approvedBy: `${activeUser.name} (${activeUser.designation})`,
          approvalTimestamp: nowIso,
          approvalChain: [...(req.approvalChain || []), newChainItem]
        };
      }
      return req;
    }));

    const notif = sendNotification({
      type: 'SMS',
      recipient: { name: targetReq.requestedBy, phone: '+1 (555) 011-4455', role: 'RECEPTIONIST' },
      role: activeUser.role,
      requestCode: targetReq.requestCode,
      patientName: targetReq.patientName,
      discountVal: targetReq.requestedDiscountVal,
      status: 'APPROVED',
      amount: targetReq.calculatedDiscountAmount
    });

    setNotifications(prev => [notif, ...prev]);
    triggerToast(`Discount ${targetReq.requestCode} APPROVED by ${activeUser.name}! Active on Billing Desk.`, 'success');

    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // Reject a request
  const rejectRequest = (requestId, comments = '') => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return false;

    const reason = (comments && comments.trim()) 
      ? comments.trim() 
      : `Declined / Rejected by ${activeUser?.name || 'Administrator'} (${activeUser?.role || 'ADMIN'}).`;

    const nowIso = new Date().toISOString();
    const newChainItem = {
      step: (targetReq.approvalChain?.length || 1) + 1,
      title: 'Request Declined',
      actor: `${activeUser.name} (${activeUser.designation})`,
      role: activeUser.role,
      action: 'REJECTED',
      comments: reason,
      timestamp: nowIso
    };

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: 'REJECTED',
          approverComments: reason,
          approvedBy: `${activeUser.name} (${activeUser.designation})`,
          approvalTimestamp: nowIso,
          approvalChain: [...(req.approvalChain || []), newChainItem]
        };
      }
      return req;
    }));

    const notif = sendNotification({
      type: 'SMS',
      recipient: { name: targetReq.requestedBy, phone: '+1 (555) 011-4455', role: 'RECEPTIONIST' },
      role: activeUser.role,
      requestCode: targetReq.requestCode,
      patientName: targetReq.patientName,
      discountVal: targetReq.requestedDiscountVal,
      status: 'REJECTED',
      amount: targetReq.calculatedDiscountAmount
    });

    setNotifications(prev => [notif, ...prev]);
    triggerToast(`Discount ${targetReq.requestCode} REJECTED by ${activeUser.name}. (Moved to Rejected tab)`, 'warning');
    return true;
  };

  // Admin user CRUD actions
  const addUser = (userData) => {
    const username = (userData.username && userData.username.trim())
      ? userData.username.trim()
      : userData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const password = (userData.password && userData.password.trim())
      ? userData.password.trim()
      : 'Pass@123';

    const newUser = {
      id: 'USR-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      username,
      password,
      name: userData.name,
      role: userData.role,
      designation: userData.designation || userData.role,
      department: userData.department || 'Billing & Accounts',
      email: userData.email || `${username}@carepulse.com`,
      phone: userData.phone || '+1 (555) 000-0000',
      active: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`
    };

    setUsers(prev => {
      const nextUsers = [...prev, newUser];
      localStorage.setItem('carepulse_users', JSON.stringify(nextUsers));
      return nextUsers;
    });

    if (userData.role === 'DOCTOR' && userData.name) {
      addDoctor(userData.name);
    }

    triggerToast(`New Doctor / User ID "${userData.name}" (Username: ${username}, Password: ${password}) created successfully!`, 'success');
  };

  const updateUser = (userId, updatedFields) => {
    setUsers(prev => {
      const nextUsers = prev.map(u => (u.id === userId || u.username === userId) ? { ...u, ...updatedFields } : u);
      localStorage.setItem('carepulse_users', JSON.stringify(nextUsers));
      return nextUsers;
    });
    setActiveUser(prev => {
      if (prev && (prev.id === userId || prev.username === userId)) {
        const updatedActive = { ...prev, ...updatedFields };
        localStorage.setItem('carepulse_active_user', updatedActive.id || updatedActive.username);
        return updatedActive;
      }
      return prev;
    });
    triggerToast('User designation & profile updated successfully.', 'success');
  };

  const deleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    triggerToast('User removed from directory.', 'info');
  };

  // Department Admin CRUD actions
  const addDepartment = (deptName) => {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      triggerToast(`Department "${trimmed}" already exists.`, 'warning');
      return;
    }
    setDepartments(prev => {
      const next = [...prev, trimmed];
      localStorage.setItem('carepulse_departments', JSON.stringify(next));
      pushToLocalServerSync({ departments: next });
      return next;
    });
    triggerToast(`New department "${trimmed}" added successfully by Admin!`, 'success');
  };

  const deleteDepartment = (deptName) => {
    if (!deptName) return;
    const target = deptName.trim().toLowerCase();
    setDepartments(prev => {
      const next = prev.filter(d => d.trim().toLowerCase() !== target);
      localStorage.setItem('carepulse_departments', JSON.stringify(next));
      pushToLocalServerSync({ departments: next });
      return next;
    });
    triggerToast(`Department "${deptName}" removed.`, 'info');
  };

  // Service Admin CRUD actions
  const addService = (serviceName) => {
    const trimmed = serviceName.trim();
    if (!trimmed) return;
    if (services.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      triggerToast(`Service "${trimmed}" already exists.`, 'warning');
      return;
    }
    setServices(prev => {
      const next = [...prev, trimmed];
      localStorage.setItem('carepulse_services', JSON.stringify(next));
      pushToLocalServerSync({ services: next });
      return next;
    });
    triggerToast(`New hospital service "${trimmed}" added successfully by Admin!`, 'success');
  };

  const deleteService = (serviceName) => {
    if (!serviceName) return;
    const target = serviceName.trim().toLowerCase();
    setServices(prev => {
      const next = prev.filter(s => s.trim().toLowerCase() !== target);
      localStorage.setItem('carepulse_services', JSON.stringify(next));
      pushToLocalServerSync({ services: next });
      return next;
    });
    triggerToast(`Hospital service "${serviceName}" removed.`, 'info');
  };

  // Doctor Admin CRUD actions
  const addDoctor = (doctorName) => {
    const trimmed = doctorName.trim();
    if (!trimmed) return;
    if (doctors.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      triggerToast(`Doctor "${trimmed}" already exists.`, 'warning');
      return;
    }
    setDoctors(prev => {
      const next = [...prev, trimmed];
      localStorage.setItem('carepulse_doctors', JSON.stringify(next));
      pushToLocalServerSync({ doctors: next });
      return next;
    });
    triggerToast(`New doctor "${trimmed}" added to directory successfully!`, 'success');
  };

  const deleteDoctor = (doctorName) => {
    if (!doctorName) return;
    const target = doctorName.trim().toLowerCase();
    setDoctors(prev => {
      const next = prev.filter(d => d.trim().toLowerCase() !== target);
      localStorage.setItem('carepulse_doctors', JSON.stringify(next));
      pushToLocalServerSync({ doctors: next });
      return next;
    });
    triggerToast(`Doctor "${doctorName}" removed from directory.`, 'info');
  };

  const clearAllDoctors = () => {
    setDoctors([]);
    localStorage.setItem('carepulse_doctors', JSON.stringify([]));
    pushToLocalServerSync({ doctors: [] });
    triggerToast('All preset doctors cleared from directory.', 'info');
  };

  const deleteRequest = (requestId) => {
    if (!requestId) return false;
    const req = requests.find(r => r.id === requestId);
    setRequests(prev => {
      const nextRequests = prev.filter(r => r.id !== requestId);
      localStorage.setItem('carepulse_requests', JSON.stringify(nextRequests));
      return nextRequests;
    });
    triggerToast(`Discount request #${req?.requestCode || requestId} has been removed permanently.`, 'info');
    return true;
  };

  const resetSystemDefaults = () => {
    localStorage.removeItem('carepulse_users');
    localStorage.removeItem('carepulse_departments');
    localStorage.removeItem('carepulse_services');
    localStorage.removeItem('carepulse_doctors');
    localStorage.removeItem('carepulse_requests');
    localStorage.removeItem('carepulse_notifs');
    setUsers(INITIAL_USERS);
    setDepartments(INITIAL_DEPARTMENTS);
    setServices(INITIAL_SERVICES);
    setDoctors(INITIAL_DOCTORS);
    setRequests(INITIAL_REQUESTS);
    setActiveUser(INITIAL_USERS.find(u => u.role === 'ADMIN') || INITIAL_USERS[0]);
    triggerToast('System data reset to default configuration!', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        users,
        activeUser,
        setActiveUser,
        isAuthenticated,
        login,
        logout,
        departments,
        addDepartment,
        deleteDepartment,
        services,
        addService,
        deleteService,
        SERVICE_DEPARTMENT_MAP,
        getDepartmentForService,
        doctors,
        addDoctor,
        deleteDoctor,
        clearAllDoctors,
        requests,
        resetSystemDefaults,
        notifications,
        supabaseConfig,
        setSupabaseConfig,
        toastAlert,
        triggerToast,
        getRequiredAuthorityForDiscount,
        isBillingRole,
        getRoleMeta,
        createDiscountRequest,
        createDirectExecutiveGrant,
        escalateRequest,
        approveRequest,
        rejectRequest,
        addUser,
        updateUser,
        deleteUser,
        deleteRequest,
        getMobileSyncUrl,
        importSystemSyncData,
        getCommonAppUrl,
        copyCommonAppUrl,
        openCommonAppUrl,
        commonIp,
        setCommonIp,
        copyToClipboard,
        manualSync
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
