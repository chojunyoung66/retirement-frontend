import { trackExpertReviewRequested, type ExpertReviewPlacement } from '../analytics';
import { resolveExpertReviewUrl } from '../utils/expert-review';

const EXPERT_REVIEW_URL = resolveExpertReviewUrl(import.meta.env.VITE_EXPERT_REVIEW_URL);

/** 외부 폼으로 전문가 검토를 요청한다 — 주소에 개인정보를 붙이지 않고, 서버에도 저장하지 않는다 */
export default function ExpertReviewButton({
  scenarioType,
  placement,
}: {
  scenarioType: string;
  placement: ExpertReviewPlacement;
}) {
  if (!EXPERT_REVIEW_URL) return null;
  return (
    <div className="mt-8">
      <a
        className="btn-back"
        style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
        href={EXPERT_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackExpertReviewRequested(scenarioType, placement)}
      >
        전문가 검토 요청하기
      </a>
      <p className="form-hint mt-4">
        외부 신청 폼으로 이동해요. 이 서비스는 신청 내용을 저장하지 않으며, 리포트는 직접 첨부해 주세요.
      </p>
    </div>
  );
}
