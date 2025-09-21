import { useState } from "react";
import Page1 from "./pages/Page1.jsx";
import Page2 from "./pages/Page2.jsx";
// import Page3 from "./pages/Page3.jsx";
// import Page4 from "./pages/Page4.jsx";
// import Page5 from "./pages/Page5.jsx";
// import Page6 from "./pages/Page6.jsx";
// import Page7 from "./pages/Page7.jsx";
// import Page8 from "./pages/Page8.jsx";

const pages = [
  Page1,
  Page2,
  // Page3,
  // Page4,
  // Page5,
  // Page6,
  // Page7,
  // Page8
];

export default function App() {
  const [currentPage, setCurrentPage] = useState(0);

  const Current = pages[currentPage];

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ border: "1px solid #ccc", minHeight: "200px", padding: "20px" }}>
        <Current />
      </div>

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          ← Back
        </button>

        <button
          onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
          disabled={currentPage === pages.length - 1}
          style={{ marginLeft: "10px" }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
