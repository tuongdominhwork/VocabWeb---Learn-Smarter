import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SQRT_5000 = Math.sqrt(5000);

const TESTIMONIALS = [
  {
    tempId: 0,
    testimonial: "VocabWeb completely changed how I prepare for exams. The CEFR structure helped me jump from B1 to B2 in under four months.",
    by: "Anh Nguyen, University Student",
    imgSrc: "https://i.pravatar.cc/150?img=47",
  },
  {
    tempId: 1,
    testimonial: "Running live classroom tests and tracking individual progress used to take hours. Now it's done in one screen.",
    by: "Ms. Linh Tran, English Teacher",
    imgSrc: "https://i.pravatar.cc/150?img=48",
  },
  {
    tempId: 2,
    testimonial: "The analytics dashboard gives me a crystal-clear view of where each class is struggling. Exactly what I needed.",
    by: "Dr. Minh Pham, Department Head",
    imgSrc: "https://i.pravatar.cc/150?img=12",
  },
  {
    tempId: 3,
    testimonial: "My students actually look forward to daily quizzes now. The gamification keeps them hooked.",
    by: "Mr. Duc Hoang, High School Teacher",
    imgSrc: "https://i.pravatar.cc/150?img=53",
  },
  {
    tempId: 4,
    testimonial: "I love that I can switch the entire interface to Vietnamese. Makes onboarding new students so much smoother.",
    by: "Phuong Le, Language Center Admin",
    imgSrc: "https://i.pravatar.cc/150?img=49",
  },
  {
    tempId: 5,
    testimonial: "The live test feature is incredible. Real-time results for the whole class — my students are always on their toes.",
    by: "Tuan Nguyen, IELTS Tutor",
    imgSrc: "https://i.pravatar.cc/150?img=54",
  },
  {
    tempId: 6,
    testimonial: "I studied 500 words in one month without feeling overwhelmed. The spaced repetition just works.",
    by: "Ha Vy, High School Student",
    imgSrc: "https://i.pravatar.cc/150?img=44",
  },
  {
    tempId: 7,
    testimonial: "Importing vocab lists and assigning them to classrooms takes seconds. Saved me hours every week.",
    by: "Ms. Thu Bui, Language Teacher",
    imgSrc: "https://i.pravatar.cc/150?img=43",
  },
  {
    tempId: 8,
    testimonial: "If I could give 11 stars, I'd give 12. Best vocabulary tool I've used in my teaching career.",
    by: "Khanh Nguyen, University Lecturer",
    imgSrc: "https://i.pravatar.cc/150?img=55",
  },
  {
    tempId: 9,
    testimonial: "The hint system is genius — it guides you without giving away the answer. My retention has skyrocketed.",
    by: "Bao Tran, TOEFL Candidate",
    imgSrc: "https://i.pravatar.cc/150?img=56",
  },
];

function TestimonialCard({ position, testimonial, handleMove, cardSize }) {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => handleMove(position)}
      className={`absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out ${
        isCenter
          ? 'z-10 bg-primary-600 text-white border-primary-600'
          : 'z-0 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-primary-400'
      }`}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(40px 0%, calc(100% - 40px) 0%, 100% 40px, 100% 100%, calc(100% - 40px) 100%, 40px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter
          ? '0px 8px 0px 4px rgba(99,102,241,0.25)'
          : '0px 0px 0px 0px transparent',
      }}
    >
      <span
        className={`absolute block origin-top-right rotate-45 ${isCenter ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'}`}
        style={{ right: -2, top: 38, width: SQRT_5000, height: 2 }}
      />
      <img
        src={testimonial.imgSrc}
        alt={testimonial.by.split(',')[0]}
        className="mb-4 h-14 w-12 object-cover object-top"
        style={{ boxShadow: isCenter ? '3px 3px 0px rgba(255,255,255,0.2)' : '3px 3px 0px rgba(0,0,0,0.08)' }}
      />
      <h3 className={`text-sm sm:text-base font-medium leading-snug ${isCenter ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
        "{testimonial.testimonial}"
      </h3>
      <p className={`absolute bottom-8 left-8 right-8 mt-2 text-xs italic ${isCenter ? 'text-white/75' : 'text-gray-400 dark:text-gray-500'}`}>
        — {testimonial.by}
      </p>
    </div>
  );
}

export function StaggerTestimonials() {
  const [cardSize, setCardSize] = useState(340);
  const [list, setList] = useState(TESTIMONIALS);

  const handleMove = (steps) => {
    const newList = [...list];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setList(newList);
  };

  useEffect(() => {
    const update = () => setCardSize(window.matchMedia('(min-width: 640px)').matches ? 340 : 270);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 560 }}>
      {list.map((testimonial, index) => {
        const position =
          list.length % 2
            ? index - (list.length + 1) / 2
            : index - list.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}

      {/* Prev / Next buttons */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          onClick={() => handleMove(-1)}
          aria-label="Previous testimonial"
          className="flex h-12 w-12 items-center justify-center border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => handleMove(1)}
          aria-label="Next testimonial"
          className="flex h-12 w-12 items-center justify-center border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
