import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { RotatingNoticesAppConfig, NoticeCard } from "../../announcementsTypes";
import { cardsForBoard } from "../../announcementsTypes";

// Rotates through config.boards, one at a time, each for its own `duration`
// (spec: duration is per-board, not per-message). A single-board config
// just stays on that one board forever — no timer needed.
export function useBoardRotation(config: Ref<RotatingNoticesAppConfig>) {
  const boardIndex = ref(0);
  let rotateTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleNextBoard() {
    if (rotateTimer) clearTimeout(rotateTimer);
    const boards = config.value.boards;
    if (boards.length <= 1) return;
    const durationMs = (boards[boardIndex.value]?.duration ?? 10) * 1000;
    rotateTimer = setTimeout(() => {
      boardIndex.value = (boardIndex.value + 1) % boards.length;
    }, durationMs);
  }

  watch(boardIndex, () => scheduleNextBoard());
  watch(
    () => config.value.boards,
    () => {
      boardIndex.value = 0;
      scheduleNextBoard();
    },
  );

  onMounted(scheduleNextBoard);
  onUnmounted(() => {
    if (rotateTimer) clearTimeout(rotateTimer);
  });

  const activeBoard = computed(() => config.value.boards[boardIndex.value] ?? config.value.boards[0]);
  const cards = computed<NoticeCard[]>(() =>
    activeBoard.value ? cardsForBoard(activeBoard.value) : [],
  );

  return { boardIndex, activeBoard, cards };
}
