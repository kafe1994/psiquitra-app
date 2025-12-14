import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import database from '@/config/database';
import config from '@/config';

class SeedData {
  async seed(): Promise<void> {
    try {
      console.log('🌱 Iniciando seed de datos de prueba...');

      // Verificar si ya existen datos
      const existingUsers = await this.checkExistingData();
      if (existingUsers) {
        console.log('⚠️  Los datos ya existen. Saltando seed.');
        return;
      }

      // Crear usuario administrador/psiquiatra de prueba
      await this.createTestUser();

      // Crear pacientes de prueba
      await this.createTestPatients();

      // Crear citas de prueba
      await this.createTestAppointments();

      console.log('🎉 Seed de datos completado exitosamente');

    } catch (error) {
      console.error('❌ Error ejecutando seed:', error);
      throw error;
    }
  }

  private async checkExistingData(): Promise<boolean> {
    try {
      const query = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
      const result = await database.query(query, ['dr.smith@psychiatry.com']);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      return false;
    }
  }

  private async createTestUser(): Promise<void> {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('password123', config.auth.bcryptRounds);

    const query = `
      INSERT INTO users (
        id, email, password_hash, full_name, role, license_number, specialty, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      userId,
      'dr.smith@psychiatry.com',
      passwordHash,
      'Dr. John Smith',
      'psychiatrist',
      'PSY001',
      'Psiquiatría General y Terapia Cognitiva',
      true
    ];

    await database.query(query, values);
    console.log('✅ Usuario de prueba creado: dr.smith@psychiatry.com / password123');

    return userId;
  }

  private async createTestPatients(): Promise<string[]> {
    const userQuery = 'SELECT id FROM users WHERE email = $1';
    const userResult = await database.query(userQuery, ['dr.smith@psychiatry.com']);
    const createdBy = userResult.rows[0].id;

    const patients = [
      {
        first_name: 'María',
        last_name: 'González',
        date_of_birth: '1985-03-15',
        gender: 'F',
        phone: '+34612345678',
        email: 'maria.gonzalez@email.com',
        id_number: '12345678A',
        address: 'Calle Mayor 123, Madrid',
        emergency_contact: 'Pedro González',
        emergency_contact_phone: '+34612345679',
        insurance_info: 'Sanitas',
        referring_doctor: 'Dr. López'
      },
      {
        first_name: 'Carlos',
        last_name: 'Rodríguez',
        date_of_birth: '1978-11-22',
        gender: 'M',
        phone: '+34623456789',
        email: 'carlos.rodriguez@email.com',
        id_number: '23456789B',
        address: 'Avenida Libertad 456, Barcelona',
        emergency_contact: 'Ana Rodríguez',
        emergency_contact_phone: '+34623456790',
        insurance_info: 'Adeslas',
        referring_doctor: 'Dr. Martín'
      },
      {
        first_name: 'Elena',
        last_name: 'Martín',
        date_of_birth: '1992-07-08',
        gender: 'F',
        phone: '+34634567890',
        email: 'elena.martin@email.com',
        id_number: '34567890C',
        address: 'Plaza España 789, Valencia',
        emergency_contact: 'Luis Martín',
        emergency_contact_phone: '+34634567891',
        insurance_info: 'DKV',
        referring_doctor: 'Dra. Sánchez'
      },
      {
        first_name: 'Roberto',
        last_name: 'Fernández',
        date_of_birth: '1980-12-03',
        gender: 'M',
        phone: '+34645678901',
        email: 'roberto.fernandez@email.com',
        id_number: '45678901D',
        address: 'Calle Sol 321, Sevilla',
        emergency_contact: 'Carmen Fernández',
        emergency_contact_phone: '+34645678902',
        insurance_info: 'Mapfre',
        referring_doctor: 'Dr. Ruiz'
      },
      {
        first_name: 'Ana',
        last_name: 'López',
        date_of_birth: '1988-09-17',
        gender: 'F',
        phone: '+34656789012',
        email: 'ana.lopez@email.com',
        id_number: '56789012E',
        address: 'Paseo Rosales 654, Bilbao',
        emergency_contact: 'Miguel López',
        emergency_contact_phone: '+34656789013',
        insurance_info: 'AXA',
        referring_doctor: 'Dra. Gómez'
      }
    ];

    const patientIds: string[] = [];

    for (const patient of patients) {
      const patientId = uuidv4();
      
      // Generar número de historia clínica
      const year = new Date().getFullYear();
      const sequence = patientIds.length + 1;
      const medicalRecordNumber = `${year}-${sequence.toString().padStart(3, '0')}`;

      const query = `
        INSERT INTO patients (
          id, medical_record_number, first_name, last_name, date_of_birth, gender,
          phone, email, id_number, address, emergency_contact, emergency_contact_phone,
          insurance_info, referring_doctor, created_by, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `;

      const values = [
        patientId,
        medicalRecordNumber,
        patient.first_name,
        patient.last_name,
        patient.date_of_birth,
        patient.gender,
        patient.phone,
        patient.email,
        patient.id_number,
        patient.address,
        patient.emergency_contact,
        patient.emergency_contact_phone,
        patient.insurance_info,
        patient.referring_doctor,
        createdBy,
        true
      ];

      await database.query(query, values);
      patientIds.push(patientId);
    }

    console.log(`✅ ${patients.length} pacientes de prueba creados`);
    return patientIds;
  }

  private async createTestAppointments(): Promise<void> {
    // Obtener psiquiatra
    const psychiatristQuery = 'SELECT id FROM users WHERE email = $1';
    const psychiatristResult = await database.query(psychiatristQuery, ['dr.smith@psychiatry.com']);
    const psychiatristId = psychiatristResult.rows[0].id;

    // Obtener pacientes
    const patientsQuery = 'SELECT id, first_name, last_name FROM patients WHERE is_active = true ORDER BY created_at';
    const patientsResult = await database.query(patientsQuery);
    const patients = patientsResult.rows;

    const appointments = [
      {
        patient_id: patients[0].id,
        appointment_date: new Date().toISOString().split('T')[0], // Hoy
        start_time: '09:00',
        duration_minutes: 60,
        type: 'consultation',
        status: 'confirmed',
        notes: 'Primera consulta, evaluación inicial'
      },
      {
        patient_id: patients[1].id,
        appointment_date: new Date().toISOString().split('T')[0], // Hoy
        start_time: '10:30',
        duration_minutes: 45,
        type: 'follow_up',
        status: 'scheduled',
        notes: 'Seguimiento de tratamiento'
      },
      {
        patient_id: patients[2].id,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mañana
        start_time: '11:00',
        duration_minutes: 60,
        type: 'evaluation',
        status: 'scheduled',
        notes: 'Evaluación psicológica'
      },
      {
        patient_id: patients[3].id,
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Pasado mañana
        start_time: '15:30',
        duration_minutes: 90,
        type: 'therapy',
        status: 'scheduled',
        notes: 'Sesión de terapia cognitivo-conductual'
      },
      {
        patient_id: patients[4].id,
        appointment_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 días después
        start_time: '16:00',
        duration_minutes: 30,
        type: 'medication_review',
        status: 'scheduled',
        notes: 'Revisión de medicación'
      },
      {
        patient_id: patients[0].id,
        appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 semana después
        start_time: '09:30',
        duration_minutes: 60,
        type: 'follow_up',
        status: 'scheduled',
        notes: 'Seguimiento semanal'
      }
    ];

    for (const appointment of appointments) {
      const appointmentId = uuidv4();
      
      // Calcular hora de fin
      const startTime = new Date(`2000-01-01T${appointment.start_time}:00`);
      const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60 * 1000);
      const endTimeStr = endTime.toTimeString().split(' ')[0].substring(0, 5);

      const query = `
        INSERT INTO appointments (
          id, patient_id, psychiatrist_id, appointment_date, start_time, end_time,
          duration_minutes, type, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const values = [
        appointmentId,
        appointment.patient_id,
        psychiatristId,
        appointment.appointment_date,
        appointment.start_time,
        endTimeStr,
        appointment.duration_minutes,
        appointment.type,
        appointment.status,
        appointment.notes
      ];

      await database.query(query, values);
    }

    console.log(`✅ ${appointments.length} citas de prueba creadas`);
  }

  async clearData(): Promise<void> {
    try {
      console.log('🧹 Limpiando datos de prueba...');

      // Eliminar en orden inverso para respetar foreign keys
      await database.query('DELETE FROM appointments');
      await database.query('DELETE FROM patients');
      await database.query('DELETE FROM users WHERE email = $1', ['dr.smith@psychiatry.com']);
      
      console.log('✅ Datos de prueba limpiados');
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
      throw error;
    }
  }
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
  const seeder = new SeedData();
  
  const command = process.argv[2];
  
  if (command === 'clear') {
    seeder.clearData()
      .then(() => {
        console.log('🎉 Datos limpiados');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Error limpiando datos:', error);
        process.exit(1);
      });
  } else {
    seeder.seed()
      .then(() => {
        console.log('🎉 Seed completado');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Error en seed:', error);
        process.exit(1);
      });
  }
}

export default SeedData;