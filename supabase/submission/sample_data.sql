-- Sample data for the project (optional)
--
-- NOTE:
-- - This script assumes there is at least ONE user in auth.users.
-- - Run in Supabase Dashboard -> SQL Editor (admin context), or with service role.
-- - This script only inserts into public tables; it does NOT upload real files to Storage.

begin;

do $$
declare
  v_user_id uuid;
  v_diag_id uuid;
  v_storage_path text;
  v_demo_url text := 'https://example.com/demo-leaf.png';
begin
  select id
  into v_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'Không có user trong auth.users. Hãy tạo 1 user ở Authentication -> Users trước khi chạy sample_data.sql';
  end if;

  insert into public.diagnoses (
    user_id,
    plant_label,
    disease_label,
    plant_confidence,
    disease_confidence,
    status,
    recommendation,
    image_url,
    model_version,
    note
  )
  values (
    v_user_id,
    'Tomato',
    'Late blight',
    0.9876,
    0.9234,
    'completed',
    'Dữ liệu mẫu: cần cắt bỏ lá bệnh, theo dõi độ ẩm, và cân nhắc sử dụng thuốc phù hợp theo hướng dẫn địa phương.',
    v_demo_url,
    'demo-model',
    'Dòng dữ liệu mẫu để minh hoạ luồng lưu kết quả chẩn đoán.'
  )
  returning id into v_diag_id;

  v_storage_path := v_user_id::text
    || '/' || to_char(now(), 'YYYY/MM/DD')
    || '/' || replace(gen_random_uuid()::text, '-', '')
    || '-demo-leaf.png';

  insert into public.diagnosis_images (
    diagnosis_id,
    user_id,
    storage_path,
    image_url,
    plant_label,
    disease_label,
    plant_confidence,
    disease_confidence,
    analysis_status
  )
  values (
    v_diag_id,
    v_user_id,
    v_storage_path,
    v_demo_url,
    'Tomato',
    'Late blight',
    0.9876,
    0.9234,
    'completed'
  );

  insert into public.feedbacks (
    diagnosis_id,
    user_id,
    is_correct,
    note
  )
  values (
    v_diag_id,
    v_user_id,
    true,
    'Dữ liệu mẫu: người dùng xác nhận kết quả là đúng.'
  );

  insert into public.scan_history (
    user_id,
    image_url,
    plant_label,
    disease_label,
    confidence,
    status,
    note
  )
  values (
    v_user_id,
    v_demo_url,
    'Tomato',
    'Late blight',
    0.9234,
    'completed',
    'Dữ liệu mẫu: lịch sử quét.'
  );
end $$;

commit;
