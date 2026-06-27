import type { HistoryFeatureProps } from "../history.types";

export function HistoryFeature({
  deviceCount,
  messageCount,
  paired,
}: HistoryFeatureProps) {
  const items = [
    paired ? "Second device paired" : "Waiting for second device",
    `${messageCount} text drop${messageCount === 1 ? "" : "s"} in this session`,
    `${deviceCount}/2 devices currently live`,
  ];

  return (
    <section className="history-feature">
      <div className="history-feature__header">
        <span className="section-kicker">History</span>
        <h3>Session trail</h3>
      </div>

      <div className="history-feature__items">
        {items.map((item) => (
          <div className="history-feature__item" key={item}>
            <span className="history-feature__dot" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
