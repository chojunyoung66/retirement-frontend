import { describe, expect, it } from "vitest";
import { buildReportDownloadedProps, buildReportPreviewProps } from "./trackers";

describe("리포트 이벤트 속성", () => {
  it("미리보기는 리포트 종류와 기기 모드만 보낸다 (AC-13)", () => {
    expect(buildReportPreviewProps("pc")).toEqual({
      report_type: "withdrawal_plan",
      device_mode: "pc",
    });
    expect(buildReportPreviewProps("mobile").device_mode).toBe("mobile");
  });

  it("다운로드는 형식과 방법만 보내고 숫자 값이 없다 (AC-13)", () => {
    for (const method of ["share", "download", "print"] as const) {
      const props = buildReportDownloadedProps(method);
      expect(props).toEqual({ report_format: "pdf", method });
      expect(Object.values(props).every((v) => typeof v !== "number")).toBe(true);
    }
  });
});
