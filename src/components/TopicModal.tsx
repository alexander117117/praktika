import { RotateCcw } from "lucide-react";
import { DuoIcon } from "./DuoIcon";
import { Modal } from "./Modal";
import type { Topic } from "@/lib/types";
import type { Stat } from "@/lib/stats";
import { questionsWord } from "@/lib/format";

interface Props {
  topic: Topic;
  stat: Stat;
  onStart: (reviewOnly: boolean) => void;
  onClose: () => void;
}

export function TopicModal({ topic, stat, onStart, onClose }: Props) {
  const remaining = stat.fresh + stat.learning;

  return (
    <Modal onClose={onClose}>
      <div className="modal-hero" />
      <div className="modal-body">
        <h3>{topic.title}</h3>
        <p className="desc">
          Тренировка в формате карточек: прочитайте вопрос, вспомните ответ, откройте
          эталон и отметьте, знаете вы его или нужно повторить.
        </p>

        <div className="check-title">Что вас ждёт</div>
        <div className="check-list">
          <div className="check-item">
            <DuoIcon name="stack" size={17} />
            <div>
              <div className="ci-name">
                {topic.questions.length} {questionsWord(topic.questions.length)}
              </div>
              <div className="ci-sub">Тема №{topic.id} диагностического профиля</div>
            </div>
          </div>
          <div className="check-item">
            <DuoIcon name="check" size={17} />
            <div>
              <div className="ci-name">Выучено {stat.learned}</div>
              <div className="ci-sub">На повторении {stat.learning}, не начато {stat.fresh}</div>
            </div>
          </div>
          <div className="check-item">
            <DuoIcon name="sparkle" size={17} />
            <div>
              <div className="ci-name">Самопроверка</div>
              <div className="ci-sub">Прогресс сохраняется автоматически</div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Закрыть
          </button>
          {remaining > 0 && remaining < stat.total ? (
            <button className="btn btn-primary" onClick={() => onStart(true)}>
              <RotateCcw size={16} />
              Повторить ({remaining})
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onStart(false)}>
              Начать тренировку
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
