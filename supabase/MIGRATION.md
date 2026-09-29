# 운영 DB 마이그레이션 안내

이전 문서의 “아직 미적용분” 목록과 “Git 동기화만으로 Lovable Cloud가 마이그레이션을 적용한다”는 설명은 운영 이력으로 검증되지 않아 제거했다. **현재 운영 DB의 적용 버전은 미확인**이다.

운영 변경 전에 실제 Supabase 프로젝트와 `supabase_migrations.schema_migrations`를 확인하고 `supabase migration list` 및 `supabase db push --dry-run` 결과를 저장소 파일과 대조한다. 누락·불일치가 있으면 스테이징에서 재현해 원인을 해결한다. DB 적용은 기존 자동 연동과 단일 운영자 CLI 방식 중 **실제로 구성된 한 경로만** 사용한다. SQL Editor에서 저장소 파일을 임의 순서로 실행하지 않는다.

백업·Storage 정책·복구 수단을 확보한 뒤 배포한다. 적용 순서, 앱 Publish, 워커 재개 및 중단 기준은 [배포 전략](../docs/product-review/2026-09-29/DEPLOYMENT_STRATEGY.md)에 기록했다.
