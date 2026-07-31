import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('./.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCbtMapping() {
  const subject = 'MATEMATIKA';

  // 1. First ensure subject exists in exams table so foreign key constraint doesn't fail
  await supabase.from('exams').upsert({
    id: subject,
    nama_ujian: subject,
    durasi: 60,
    is_active: true
  });

  const qRow = {
    id: 'Q1_TEST',
    text_soal: 'Berapakah 10 + 5?',
    tipe_soal: 'PG',
    gambar: '',
    caption: 'Gambar 1',
    opsi_a: '10',
    opsi_b: '15',
    opsi_c: '20',
    opsi_d: '25',
    kunci_jawaban: 'B',
    bobot: 10,
    kelas: '6',
    tp_id: 'TP01',
    jenis_ujian: 'SUMATIF 1',
    kode_paket: 'PAKET A'
  };

  // Build payload for questions table ONLY with valid columns
  const questionRecord = {
    id: qRow.id,
    exam_id: subject,
    text_soal: qRow.text_soal,
    tipe_soal: qRow.tipe_soal,
    bobot_nilai: qRow.bobot,
    gambar: qRow.gambar,
    kelas: qRow.kelas,
    tp_id: qRow.tp_id,
    caption: qRow.caption,
    jenis_ujian: qRow.jenis_ujian,
    kode_paket: qRow.kode_paket
  };

  console.log('Inserting into questions table...');
  const { error: qErr } = await supabase.from('questions').upsert(questionRecord);
  console.log('qErr:', qErr);

  if (!qErr) {
    // Delete existing options for this question_id first
    await supabase.from('options').delete().eq('question_id', qRow.id);

    // Insert new options
    const keys = (qRow.kunci_jawaban || '').toUpperCase();
    const optionsToInsert = [
      { question_id: qRow.id, text_jawaban: qRow.opsi_a || '', is_correct: keys.includes('A') },
      { question_id: qRow.id, text_jawaban: qRow.opsi_b || '', is_correct: keys.includes('B') },
      { question_id: qRow.id, text_jawaban: qRow.opsi_c || '', is_correct: keys.includes('C') },
      { question_id: qRow.id, text_jawaban: qRow.opsi_d || '', is_correct: keys.includes('D') }
    ];

    const { error: oErr } = await supabase.from('options').insert(optionsToInsert);
    console.log('oErr:', oErr);
  }

  // Now test getRawQuestions
  console.log('Fetching raw questions...');
  const { data: fetchResult, error: fetchErr } = await supabase.from('questions').select('*, options(*)').eq('exam_id', subject);
  console.log('Fetch result:', JSON.stringify(fetchResult, null, 2), fetchErr);
}

testCbtMapping();
