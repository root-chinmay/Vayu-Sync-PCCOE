import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    emergency_numbers: [
      {
        service: 'National Emergency Number (All-in-One)',
        number: '112',
        badge: '24/7 Pan-India',
        description: 'Unified emergency response for Police, Fire, Ambulance, and Disaster events.',
        icon: 'phone-call',
        priority: 'critical',
      },
      {
        service: 'National Disaster Management Helpline (NDMA)',
        number: '1078',
        badge: 'Toll-Free',
        description: 'Emergency coordination for cyclones, severe floods, heatwaves, and landslides.',
        icon: 'shield-alert',
        priority: 'high',
      },
      {
        service: 'NDRF National Command Control Room',
        number: '011-24363260',
        badge: 'Rescue Force',
        description: 'Direct dispatch operations for National Disaster Response Force deployment.',
        icon: 'life-buoy',
        priority: 'high',
      },
      {
        service: 'Ambulance & Medical Emergency',
        number: '108',
        badge: 'Medical',
        description: 'Immediate trauma care, heatstroke response, and emergency hospitalization transit.',
        icon: 'heart-pulse',
        priority: 'critical',
      },
      {
        service: 'Fire & Rescue Services',
        number: '101',
        badge: 'Fire Safety',
        description: 'Building fires, chemical hazards, and storm debris rescue.',
        icon: 'flame',
        priority: 'critical',
      },
      {
        service: 'Police Emergency',
        number: '100',
        badge: 'Security',
        description: 'Public safety, highway traffic emergencies, and localized crowd safety.',
        icon: 'shield',
        priority: 'high',
      },
      {
        service: 'Women Safety Helpline',
        number: '1091',
        badge: 'Assistance',
        description: 'Round-the-clock safety, transit escort helpline, and emergency distress support.',
        icon: 'users',
        priority: 'high',
      },
      {
        service: 'IMD Mausam Seva (Weather Enquiry)',
        number: '1800-180-1717',
        badge: 'Meteorological',
        description: 'India Meteorological Department official public toll-free weather query line.',
        icon: 'cloud-sun',
        priority: 'standard',
      },
      {
        service: 'Kisan Call Centre (Agriculture / Krishi)',
        number: '1800-180-1551',
        badge: 'Agromet',
        description: 'Ministry of Agriculture & Farmers Welfare crop weather protection advisory.',
        icon: 'sprout',
        priority: 'standard',
      },
    ],
    helpline_categories: [
      {
        category: 'Weather & Disaster Assistance',
        contacts: [
          { title: 'National Disaster Helpline', number: '1078', hours: '24/7 Toll-free' },
          { title: 'NDRF Control Room', number: '9711077372', hours: '24/7 Operations' },
          { title: 'IMD Weather Information Desk', number: '011-24651212', hours: '06:00 - 22:00 IST' },
          { title: 'Central Water Commission (Flood Alert)', number: '011-26106523', hours: '24/7 Monsoon Room' },
        ],
      },
      {
        category: 'Health, Heat & Medical Support',
        contacts: [
          { title: 'National Emergency Ambulance', number: '108', hours: '24/7 Immediate Dispatch' },
          { title: 'Disaster Mental Health Helpline (KIRAN)', number: '1800-599-0019', hours: '24/7 Support' },
          { title: 'Heatstroke Response Coordination', number: '104', hours: '24/7 State Health Line' },
        ],
      },
      {
        category: 'Agriculture & Rural Support',
        contacts: [
          { title: 'Kisan Call Centre (Agro-Advisory)', number: '1800-180-1551', hours: '06:00 - 22:00 IST' },
          { title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', number: '14447', hours: 'Toll-free Crop Insurance' },
        ],
      },
    ],
  });
}
