import { createClient } from '@supabase/supabase-js';

// Default mock values if environment variables are missing
const defaultUrl = 'https://mock-hospital-supabase.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_key';

let supabaseClient = null;

export const getSupabaseClient = (customUrl, customKey) => {
  const url = customUrl || import.meta.env.VITE_SUPABASE_URL || defaultUrl;
  const key = customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

  try {
    if (url !== defaultUrl) {
      return createClient(url, key);
    }
  } catch (err) {
    console.warn('Supabase initialization warning:', err);
  }
  return null;
};

// SQL Schema script for user reference when setting up real Supabase database
export const SUPABASE_SQL_SCHEMA = `-- CarePulse Hospital Billing Discount Database Schema
-- Run this in your Supabase SQL Editor:

-- 1. Create User Roles & Thresholds table
CREATE TABLE IF NOT EXISTS hospital_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL, -- 'ADMIN', 'CHAIRMAN', 'MD', 'MANAGER', 'RECEPTIONIST'
  max_discount_limit NUMERIC NOT NULL DEFAULT 10, -- e.g. 100 for Chairman, 50 for MD, 10 for Manager
  designation TEXT NOT NULL,
  department TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Discount Requests table
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL UNIQUE,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age INT,
  patient_gender TEXT,
  department TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  total_bill_amount NUMERIC NOT NULL,
  requested_discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' or 'FIXED'
  requested_discount_val NUMERIC NOT NULL,
  calculated_discount_amount NUMERIC NOT NULL,
  final_payable_amount NUMERIC NOT NULL,
  reason_category TEXT NOT NULL, -- 'Below Poverty Line', 'Staff Welfare', 'Emergency Charity', 'Management Grant'
  detailed_reason TEXT NOT NULL,
  proof_file_url TEXT,
  requested_by TEXT NOT NULL,
  required_authority_role TEXT NOT NULL,
  assigned_approver_id UUID REFERENCES hospital_users(id),
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'
  approver_comments TEXT,
  approved_by TEXT,
  approval_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Realtime for live updates across tabs
ALTER PUBLICATION supabase_realtime ADD TABLE discount_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE hospital_users;
`;
