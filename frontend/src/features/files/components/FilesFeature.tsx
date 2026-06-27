import { formatSessionTimeLeft } from "../../session/session.utils";
import type { FilesFeatureProps } from "../files.types";

const fileCards = [
  { icon: "▣", name: "Screenshots", meta: "PNG, JPG" },
  { icon: "▤", name: "Notes.pdf", meta: "1.2 MB" },
  { icon: "◫", name: "Links bundle", meta: "TXT clip" },
];

export function FilesFeature({ paired, sessionExpiresAt }: FilesFeatureProps) {
  return (
    <section className="files-feature">
      <div className="files-feature__drop-zone">
        <div className="files-feature__halo" />
        <div className="files-feature__upload-icon">↑</div>
        <h3>Drop anything here</h3>
        <p>
          {paired
            ? "Photos, videos, files up to 250MB"
            : "Pair the second device to unlock file relay"}
        </p>

        <div className="files-feature__hints">
          <div className="files-feature__hint">
            <span>◐</span>
            <span>Photos</span>
          </div>
          <div className="files-feature__hint">
            <span>◨</span>
            <span>Files</span>
          </div>
          <div className="files-feature__hint">
            <span>◎</span>
            <span>Camera</span>
          </div>
        </div>
      </div>

      <div className="files-feature__list">
        {fileCards.map((file) => (
          <article className="files-feature__card" key={file.name}>
            <div className="files-feature__card-icon">{file.icon}</div>
            <div>
              <p>{file.name}</p>
              <span>{file.meta}</span>
            </div>
          </article>
        ))}
      </div>

      <p className="files-feature__meta">
        Temporary vault live for {formatSessionTimeLeft(sessionExpiresAt)}
      </p>
    </section>
  );
}
