import { FHERockPaperScissorsDemo } from "../_components/FHERockPaperScissorsDemo";

export default function GamePage() {
  return (
    <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
      <FHERockPaperScissorsDemo />
    </div>
  );
}

