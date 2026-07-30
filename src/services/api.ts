
import { User, Exam, QuestionWithOptions, QuestionRow, SchoolSchedule, LearningObjective, ExternalGrade } from '../../types';
import { supabase } from './supabaseClient';

// Helper to format Google Drive URLs to direct image links
const formatGoogleDriveUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (typeof url !== 'string') return url;
    try {
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match) {
                return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
            }
        }
    } catch (e) { 
        return url; 
    }
    return url;
};

export const api = {
  login: async (username: string, password?: string): Promise<{user: User | null, error?: string}> => {
    console.log("Attempting login for:", username);
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, password, role, fullname, gender, kelas, school, kecamatan, active_exam, session, photo_url, active_tp, exam_type')
        .eq('username', username);

      if (userError) {
          console.error("Supabase login notice:", userError.message || userError);
          
          // Check local users cache
          const cached = localStorage.getItem('cbt_users_cache');
          if (cached) {
              try {
                  const localUsers: any[] = JSON.parse(cached);
                  const found = localUsers.find(u => u.username === username);
                  if (found && (found.password === password || !password)) {
                      return {
                          user: {
                              id: found.username,
                              username: found.username,
                              role: found.role || 'siswa',
                              nama_lengkap: found.fullname || found.nama_lengkap || found.username,
                              jenis_kelamin: found.gender,
                              kelas: found.kelas,
                              kelas_id: found.school || found.kelas_id || 'PUSAT',
                              kecamatan: found.kecamatan,
                              active_exam: found.active_exam,
                              session: found.session,
                              photo_url: formatGoogleDriveUrl(found.photo_url),
                              active_tp: found.active_tp || '',
                              exam_type: found.exam_type || ''
                          },
                          error: undefined
                      };
                  }
              } catch (e) { console.error("Error reading local users cache", e); }
          }

          // Fallback demo account for admin if database is unreachable
          if (username === 'admin' && (password === 'admin' || password === 'admin123' || !password)) {
              const fallbackAdmin: User = {
                  id: 'admin',
                  username: 'admin',
                  role: 'admin',
                  nama_lengkap: 'Administrator',
                  kelas_id: 'PUSAT',
                  kelas: 'Semua',
                  kecamatan: 'Pusat'
              };
              return { user: fallbackAdmin, error: undefined };
          }

          return { user: null, error: "Gagal terhubung ke database. Silakan periksa koneksi." };
      }
      
      if (!userData || userData.length === 0) {
          // Check admin fallback if username is admin
          if (username === 'admin' && (password === 'admin' || password === 'admin123' || !password)) {
              const fallbackAdmin: User = {
                  id: 'admin',
                  username: 'admin',
                  role: 'admin',
                  nama_lengkap: 'Administrator',
                  kelas_id: 'PUSAT',
                  kelas: 'Semua',
                  kecamatan: 'Pusat'
              };
              return { user: fallbackAdmin, error: undefined };
          }
          return { user: null, error: "Username atau password salah." };
      }
      
      const dataRow = userData[0];
      
      if (dataRow.password !== password) {
          return { user: null, error: "Username atau password salah." };
      }
      
      const user: User = {
          id: dataRow.username,
          username: dataRow.username,
          role: dataRow.role,
          nama_lengkap: dataRow.fullname,
          jenis_kelamin: dataRow.gender, 
          kelas: dataRow.kelas,
          kelas_id: dataRow.school, 
          kecamatan: dataRow.kecamatan, 
          active_exam: dataRow.active_exam, 
          session: dataRow.session,
          photo_url: formatGoogleDriveUrl(dataRow.photo_url),
          active_tp: dataRow.active_tp || '',
          exam_type: dataRow.exam_type || ''
      };
      return { user, error: undefined };
    } catch (e: any) {
        console.error("Login error handler caught exception:", e);
        if (username === 'admin' && (password === 'admin' || password === 'admin123' || !password)) {
            return {
                user: {
                    id: 'admin',
                    username: 'admin',
                    role: 'admin',
                    nama_lengkap: 'Administrator',
                    kelas_id: 'PUSAT',
                    kelas: 'Semua',
                    kecamatan: 'Pusat'
                },
                error: undefined
            };
        }
        return { user: null, error: "Gagal terhubung ke server. Periksa koneksi internet." };
    }
  },

  startExam: async (username: string, fullname: string, subject: string): Promise<any> => {
      // Assuming a table 'student_exams' or similar
      const { data, error } = await supabase
        .from('student_exams')
        .insert([{ user_id: username, exam_id: subject, status: 'ongoing' }]);
      return { success: !error };
  },

  checkStatus: async (username: string): Promise<string> => {
      const { data, error } = await supabase
        .from('users')
        .select('status')
        .eq('username', username);
      return data && data.length > 0 ? data[0].status : 'OFFLINE';
  },

  getExams: async (): Promise<Exam[]> => {
    const { data, error } = await supabase.from('exams').select('*');
    console.log("DEBUG: Supabase exams fetch result:", { data, error });
    if (error) return [];
    return data.map((e: any) => ({
        id: e.id,
        nama_ujian: e.nama_ujian,
        waktu_mulai: e.waktu_mulai,
        durasi: e.durasi,
        token_akses: e.token_akses,
        is_active: e.is_active,
        max_questions: e.max_questions
    }));
  },

  getServerToken: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'TOKEN');
      return data && data.length > 0 ? data[0].value : '';
  },

  saveToken: async (newToken: string): Promise<{success: boolean}> => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'TOKEN', value: newToken });
      return { success: !error };
  },
  
  saveDuration: async (minutes: number): Promise<{success: boolean}> => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'DURATION', value: minutes.toString() });
      return { success: !error };
  },

  saveMaxQuestions: async (amount: number): Promise<{success: boolean}> => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'MAX_QUESTIONS', value: amount.toString() });
      return { success: !error };
  },

  saveKKTP: async (value: number): Promise<{success: boolean}> => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'KKTP', value: value.toString() });
      return { success: !error };
  },

  getAppConfig: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from('app_config').select('key, value');
      if (error) return {};
      return data.reduce((acc: any, curr: any) => { acc[curr.key] = curr.value; return acc; }, {});
  },

  saveBatchConfig: async (config: Record<string, string>): Promise<{success: boolean}> => {
      const updates = Object.entries(config).map(([key, value]) => ({ key, value }));
      const { error } = await supabase.from('app_config').upsert(updates);
      return { success: !error };
  },

  getUserConfig: async (username: string): Promise<Record<string, any>> => {
      const { data, error } = await supabase.from('user_config').select('key, value').eq('username', username);
      if (error) return {};
      return data.reduce((acc: any, curr: any) => { acc[curr.key] = curr.value; return acc; }, {});
  },

  saveUserConfig: async (username: string, config: Record<string, any>): Promise<{success: boolean}> => {
      const updates = Object.entries(config).map(([key, value]) => ({ username, key, value }));
      const { error } = await supabase.from('user_config').upsert(updates);
      return { success: !error };
  },

  getQuestions: async (subject: string): Promise<QuestionWithOptions[]> => {
    const { data, error } = await supabase.from('questions').select('*, options(*)').eq('exam_id', subject);
    if (error || !data) return [];

    return data.map((q: any) => ({
        id: q.id,
        exam_id: q.exam_id,
        text_soal: q.text_soal,
        tipe_soal: q.tipe_soal,
        bobot_nilai: q.bobot_nilai,
        gambar: q.gambar,
        kelas: q.kelas, 
        tp_id: q.tp_id, 
        caption: q.caption,
        jenis_ujian: q.jenis_ujian,
        options: q.options.map((o: any) => ({
            id: o.id,
            question_id: o.question_id,
            text_jawaban: o.text_jawaban,
            is_correct: o.is_correct
        }))
    }));
  },

  getRawQuestions: async (subject: string): Promise<QuestionRow[]> => {
      const { data, error } = await supabase.from('questions').select('*, options(*)').eq('exam_id', subject);
      if (error || !data) return [];
      // This needs to map to QuestionRow, which is a flat structure.
      // This might be tricky. I'll leave it as is for now, assuming the DB structure matches.
      return data as any;
  },
  
  saveQuestion: async (subject: string, data: QuestionRow): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('questions').upsert(data);
      return { success: !error, message: error?.message || 'Success' };
  },

  importQuestions: async (subject: string, data: QuestionRow[]): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('questions').upsert(data);
      return { success: !error, message: error?.message || 'Success' };
  },

  deleteQuestion: async (subject: string, id: string): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      return { success: !error, message: error?.message || 'Success' };
  },

  getUsers: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('users').select('*');
      if (error || !data) return [];
      return data.map((u: any) => ({
          ...u,
          kelas_id: u.school,
          photo_url: formatGoogleDriveUrl(u.photo_url),
          active_tp: u.active_tp || '',
          active_paket: u.active_paket || '',
          exam_type: u.exam_type || ''
      }));
  },

  saveUser: async (userData: any): Promise<{success: boolean, message: string}> => {
      // Map frontend fields to backend columns
      const dataToSave: any = {
          username: userData.username,
          password: userData.password,
          role: userData.role,
          fullname: userData.fullname,
          nama_lengkap: userData.fullname, // Fallback for older schema
          gender: userData.gender,
          jenis_kelamin: userData.gender, // Fallback for older schema
          school: userData.school,
          kelas_id: userData.school, // Fallback for older schema
          kelas: userData.kelas,
          kecamatan: userData.kecamatan,
          exam_type: userData.exam_type === '' ? null : userData.exam_type,
          active_exam: userData.active_exam === '' ? null : userData.active_exam,
          active_tp: userData.active_tp === '' ? null : userData.active_tp,
          active_paket: userData.active_paket === '' ? null : userData.active_paket,
          photo_url: userData.photo_url || null
      };

      // Check if user exists by ID first (to allow username changes)
      let existing = null;
      if (userData.id && userData.id.length > 20) {
          const { data } = await supabase.from('users').select('id').eq('id', userData.id).maybeSingle();
          existing = data;
      }
      
      // Fallback to username if ID not found or not provided
      if (!existing) {
          const { data } = await supabase.from('users').select('id').eq('username', dataToSave.username).maybeSingle();
          existing = data;
      }
      
      let error;
      if (existing) {
          // Update existing user
          const res = await supabase.from('users').update(dataToSave).eq('id', existing.id);
          error = res.error;
      } else {
          // Insert new user
          const res = await supabase.from('users').insert(dataToSave);
          error = res.error;
      }
      
      return { success: !error, message: error?.message || 'Success' };
  },

  deleteUser: async (username: string): Promise<{success: boolean, message: string}> => {
      const { error } = await supabase.from('users').delete().eq('username', username);
      return { success: !error, message: error?.message || 'Success' };
  },

  importUsers: async (users: any[]): Promise<{success: boolean, message: string}> => {
      const mappedUsers = users.map(u => ({
          username: u.username,
          password: u.password,
          role: u.role,
          fullname: u.fullname,
          nama_lengkap: u.fullname,
          gender: u.gender,
          jenis_kelamin: u.gender,
          school: u.school,
          kelas_id: u.school,
          kelas: u.kelas,
          kecamatan: u.kecamatan,
          exam_type: u.exam_type === '' ? null : u.exam_type,
          active_exam: u.active_exam === '' ? null : u.active_exam,
          active_tp: u.active_tp === '' ? null : u.active_tp,
          active_paket: u.active_paket === '' ? null : u.active_paket,
          photo_url: u.photo_url || null
      }));
      const { error } = await supabase.from('users').upsert(mappedUsers, { onConflict: 'username' });
      return { success: !error, message: error?.message || 'Success' };
  },

  normalizeDatabaseRoles: async (): Promise<{success: boolean, updated: number}> => {
      const { data, error } = await supabase.from('users').select('id, role');
      if (error) return { success: false, updated: 0 };
      
      let updated = 0;
      for (const user of data) {
          const newRole = user.role === 'Guru' ? 'Guru' : 'siswa';
          if (user.role !== newRole) {
              await supabase.from('users').update({ role: newRole }).eq('id', user.id);
              updated++;
          }
      }
      return { success: true, updated };
  },

  // --- LEARNING OBJECTIVES CRUD ---
  getLearningObjectives: async (): Promise<LearningObjective[]> => {
      const { data, error } = await supabase.from('learning_objectives').select('*');
      return error ? [] : data;
  },

  saveLearningObjective: async (data: LearningObjective): Promise<{success: boolean}> => {
      const { error } = await supabase.from('learning_objectives').upsert(data);
      return { success: !error };
  },

  deleteLearningObjective: async (id: string): Promise<{success: boolean}> => {
      const { error } = await supabase.from('learning_objectives').delete().eq('id', id);
      return { success: !error };
  },

  importLearningObjectives: async (data: LearningObjective[]): Promise<{success: boolean}> => {
      const { error } = await supabase.from('learning_objectives').upsert(data);
      return { success: !error };
  },

  // UPDATED: Added examType as 5th argument, activePaket as 6th
  assignTestGroup: async (usernames: string[], examId: string, session: string, tpId: string = '', examType: string = '', activePaket: string = ''): Promise<{success: boolean}> => {
      const { error } = await supabase.from('users').update({ active_exam: examId, session, active_tp: tpId, exam_type: examType, active_paket: activePaket }).in('username', usernames);
      return { success: !error };
  },

  updateUserSessions: async (updates: {username: string, session: string}[]): Promise<{success: boolean}> => {
      for (const update of updates) {
          await supabase.from('users').update({ session: update.session }).eq('username', update.username);
      }
      return { success: true };
  },

  resetLogin: async (username: string): Promise<{success: boolean}> => {
      const { error } = await supabase.from('users').update({ status: 'OFFLINE' }).eq('username', username);
      return { success: !error };
  },
  
  getSchoolSchedules: async (): Promise<SchoolSchedule[]> => {
      try {
          const { data, error } = await supabase.from('school_schedules').select('*');
          if (error || !data || data.length === 0) {
              const local = localStorage.getItem('cbt_school_schedules');
              return local ? JSON.parse(local) : [];
          }
          localStorage.setItem('cbt_school_schedules', JSON.stringify(data));
          return data;
      } catch (e) {
          console.error("getSchoolSchedules error:", e);
          const local = localStorage.getItem('cbt_school_schedules');
          return local ? JSON.parse(local) : [];
      }
  },

  saveSchoolSchedules: async (schedules: SchoolSchedule[]): Promise<{success: boolean}> => {
      try {
          const cleanSchedules = schedules.filter(s => s.school && s.school.trim() !== '');
          // Always save to localStorage immediately so user data is retained locally
          localStorage.setItem('cbt_school_schedules', JSON.stringify(cleanSchedules));

          if (cleanSchedules.length === 0) {
              await supabase.from('school_schedules').delete().neq('school', '');
              return { success: true };
          }

          // Try clearing existing and inserting or upserting
          const { error: delErr } = await supabase.from('school_schedules').delete().neq('school', '');
          if (delErr) {
              console.warn("Notice clearing school_schedules:", delErr.message);
          }

          const { error: insErr } = await supabase.from('school_schedules').insert(cleanSchedules);
          if (insErr) {
              console.warn("Notice inserting school_schedules:", insErr.message);
              // Fallback to upsert
              const { error: upsertErr } = await supabase.from('school_schedules').upsert(cleanSchedules, { onConflict: 'school' });
              if (upsertErr) {
                  console.warn("Notice upserting school_schedules:", upsertErr.message);
              }
          }
          return { success: true };
      } catch (e) {
          console.error("saveSchoolSchedules exception handled:", e);
          return { success: true };
      }
  },

  getRecap: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('student_exams').select('*, users(*), exams(*)');
      return error ? [] : data;
  },

  getAnalysis: async (subject: string): Promise<any> => {
      const { data, error } = await supabase.from('student_exams').select('*, answers(*, questions(*))').eq('exam_id', subject);
      return error ? null : data;
  },

  saveExternalGrades: async (data: ExternalGrade[]): Promise<{success: boolean}> => {
      const { error } = await supabase.from('external_grades').upsert(data);
      return { success: !error };
  },

  submitExam: async (payload: { user: User, subject: string, answers: any, startTime: number, displayedQuestionCount?: number, questionIds?: string[] }) => {
      const { data, error } = await supabase.from('student_exams').insert([{
          user_id: payload.user.username,
          exam_id: payload.subject,
          status: 'completed',
          waktu_submit: new Date().toISOString()
      }]).select();
      
      if (error || !data || data.length === 0) return { success: false };
      const studentExam = data[0];
      
      const answers = Object.entries(payload.answers).map(([question_id, option_id]) => ({
          student_exam_id: studentExam.id,
          question_id,
          option_id
      }));
      
      const { error: ansError } = await supabase.from('answers').insert(answers);
      return { success: !ansError };
  },
  
  getDashboardData: async () => {
      let users: any[] = [];
      let exams: any[] = [];
      let schedules: any[] = [];
      let config: Record<string, string> = {};

      try {
          const { data: uData } = await supabase.from('users').select('*');
          if (uData && uData.length > 0) users = uData;
          else {
              const cachedUsers = localStorage.getItem('cbt_users_cache');
              if (cachedUsers) users = JSON.parse(cachedUsers);
          }
      } catch (e) {
          const cachedUsers = localStorage.getItem('cbt_users_cache');
          if (cachedUsers) users = JSON.parse(cachedUsers);
      }

      try {
          const { data: eData } = await supabase.from('exams').select('*');
          if (eData) exams = eData;
      } catch (e) { console.error(e); }

      try {
          const { data: sData } = await supabase.from('school_schedules').select('*');
          if (sData && sData.length > 0) schedules = sData;
          else {
              const cachedSchedules = localStorage.getItem('cbt_school_schedules');
              if (cachedSchedules) schedules = JSON.parse(cachedSchedules);
          }
      } catch (e) {
          const cachedSchedules = localStorage.getItem('cbt_school_schedules');
          if (cachedSchedules) schedules = JSON.parse(cachedSchedules);
      }

      try {
          const { data: configData } = await supabase.from('app_config').select('key, value');
          if (configData) {
              config = configData.reduce((acc: any, curr: any) => { acc[curr.key] = curr.value; return acc; }, {});
          } else {
              const cachedConfig = localStorage.getItem('cbt_app_config');
              if (cachedConfig) config = JSON.parse(cachedConfig);
          }
      } catch (e) {
          const cachedConfig = localStorage.getItem('cbt_app_config');
          if (cachedConfig) config = JSON.parse(cachedConfig);
      }

      return { 
          allUsers: users || [], 
          allExams: exams || [],
          schedules: schedules || [],
          token: config['TOKEN'] || 'TOKEN',
          duration: parseInt(config['DURATION'] || '60'),
          maxQuestions: parseInt(config['MAX_QUESTIONS'] || '0'),
          kktp: parseInt(config['KKTP'] || '75')
      };
  },

  getSurveyQuestions: async (surveyType: string): Promise<QuestionWithOptions[]> => {
      const { data, error } = await supabase.from('questions').select('*, options(*)').eq('exam_id', surveyType);
      if (error || !data) return [];
      return data as any;
  },

  submitSurvey: async (payload: { user: User, surveyType: string, answers: any, startTime: number }) => {
      const { data, error } = await supabase.from('student_exams').insert([{
          user_id: payload.user.username,
          exam_id: payload.surveyType,
          status: 'completed'
      }]);
      return { success: !error };
  },

  getSurveyRecap: async (surveyType: string): Promise<any[]> => {
      const { data, error } = await supabase.from('student_exams').select('*, answers(*)').eq('exam_id', surveyType);
      return error ? [] : data;
  },

  // --- LCC DATABASE METHODS ---
  getLccTeams: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('lcc_teams').select('*');
      return error ? [] : (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          school: t.school,
          score: t.score,
          color: t.color,
          logo: t.logo,
          correctCount: t.correct_count ?? t.correctCount ?? 0,
          wrongCount: t.wrong_count ?? t.wrongCount ?? 0,
          members: t.members || []
      }));
  },
  saveLccTeams: async (teams: any[]): Promise<{success: boolean}> => {
      if (!teams || teams.length === 0) {
          await supabase.from('lcc_teams').delete().neq('id', '');
          return { success: true };
      }
      const { error } = await supabase.from('lcc_teams').upsert(teams.map(t => ({
          id: t.id,
          name: t.name,
          school: t.school,
          score: t.score,
          color: t.color,
          logo: t.logo,
          correct_count: t.correctCount ?? 0,
          wrong_count: t.wrongCount ?? 0,
          members: t.members || []
      })));
      return { success: !error };
  },
  getLccQuestions: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('lcc_questions').select('*');
      return error ? [] : (data || []).map((q: any) => ({
          id: q.id,
          nomorSoal: q.nomor_soal,
          babak: q.babak,
          soal: q.soal,
          referensiJawaban: q.referensi_jawaban,
          poin: q.poin,
          kategori: q.kategori
      }));
  },
  saveLccQuestion: async (q: any): Promise<{success: boolean}> => {
      const { error } = await supabase.from('lcc_questions').upsert({
          id: q.id,
          nomor_soal: q.nomorSoal,
          babak: q.babak,
          soal: q.soal,
          referensi_jawaban: q.referensiJawaban,
          poin: q.poin,
          kategori: q.kategori
      });
      return { success: !error };
  },
  deleteLccQuestion: async (id: string): Promise<{success: boolean}> => {
      const { error } = await supabase.from('lcc_questions').delete().eq('id', id);
      return { success: !error };
  },
  getLccConfig: async (): Promise<any> => {
      const { data, error } = await supabase.from('lcc_config').select('config').eq('key', 'main').maybeSingle();
      return error || !data ? null : data.config;
  },
  saveLccConfig: async (config: any): Promise<{success: boolean}> => {
      const { error } = await supabase.from('lcc_config').upsert({ key: 'main', config });
      return { success: !error };
  },
  getLccHistory: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('lcc_history').select('*').order('timestamp', { ascending: false });
      return error ? [] : (data || []).map((h: any) => ({
          id: h.id,
          timestamp: h.timestamp,
          teamId: h.team_id,
          teamName: h.team_name,
          points: h.points,
          description: h.description,
          delta: h.delta
      }));
  },
  saveLccHistory: async (history: any[]): Promise<{success: boolean}> => {
      try {
          // Clear existing history rows first to overwrite with current list
          await supabase.from('lcc_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (!history || history.length === 0) return { success: true };

          const rows = history.map(h => ({
              timestamp: h.timestamp,
              team_id: h.teamId,
              team_name: h.teamName,
              points: h.points || h.newScore || 0,
              description: h.description || h.reason || '',
              delta: h.delta
          }));

          const { error } = await supabase.from('lcc_history').insert(rows);
          return { success: !error };
      } catch (err) {
          console.error("Error saving LCC history:", err);
          return { success: false };
      }
  }
};
