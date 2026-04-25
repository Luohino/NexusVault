import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Component, DataPoint } from '../components/ui/annotation';
import { Annotation } from '@visx/annotation';
import { scaleTime, scaleLinear } from '@visx/scale';
import { extent } from 'd3-array';

const mockStockData: DataPoint[] = [
  { date: '2023-01-01', value: 100 },
  { date: '2023-01-05', value: 110 },
  { date: '2023-01-10', value: 105 },
  { date: '2023-01-15', value: 120 },
  { date: '2023-01-20', value: 115 },
  { date: '2023-01-25', value: 130 },
  { date: '2023-01-30', value: 125 },
  { date: '2023-02-05', value: 135 },
  { date: '2023-02-10', value: 140 },
  { date: '2023-02-15', value: 138 },
  { date: '2023-02-20', value: 150 },
];

const getDate = (d: DataPoint): Date => new Date(d.date);
const getStockValue = (d: DataPoint): number => d.value;

export const Docs = () => {
  // Auth handled by Clerk
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const isMobile = dimensions.width > 0 && dimensions.width < 768;
  const chartWidth = dimensions.width;
  const chartHeight = dimensions.height;

  const margin = isMobile
    ? { top: 20, right: 20, bottom: 20, left: 20 }
    : { top: 40, right: 40, bottom: 40, left: 40 };

  const innerWidth = Math.max(0, chartWidth - margin.left - margin.right);
  const innerHeight = Math.max(0, chartHeight - margin.top - margin.bottom);

  const xScale = useMemo(() => scaleTime<number>({
    domain: extent(mockStockData, getDate) as [Date, Date],
    range: [0, innerWidth],
  }), [innerWidth]);

  const yScale = useMemo(() => scaleLinear<number>({
    domain: [
      Math.min(...mockStockData.map(getStockValue)) * 0.9,
      Math.max(...mockStockData.map(getStockValue)) * 1.1,
    ],
    range: [innerHeight, 0],
  }), [innerHeight]);

  const defaultAnnotatedDatum = mockStockData[5];
  const initialAnnotationX = xScale(getDate(defaultAnnotatedDatum)) ?? 0;
  const initialAnnotationY = yScale(getStockValue(defaultAnnotatedDatum)) ?? 0;

  const [annotationPosition, setAnnotationPosition] = useState({
    x: initialAnnotationX,
    y: initialAnnotationY,
    dx: -40,
    dy: -60,
  });

  useEffect(() => {
    const currentX = xScale(getDate(defaultAnnotatedDatum)) ?? 0;
    const currentY = yScale(getStockValue(defaultAnnotatedDatum)) ?? 0;
    setAnnotationPosition((prev) => ({
      x: currentX,
      y: currentY,
      dx: prev.dx,
      dy: prev.dy,
    }));
  }, [xScale, yScale, defaultAnnotatedDatum]);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="flex justify-between items-center px-4 md:px-8 pt-8 md:pt-6 relative z-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="text-xl md:text-2xl font-bold italic tracking-tighter text-black">NexusVault</div>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          <nav className="hidden md:flex gap-6 text-sm">
            <Link to="/" className="text-gray-400 hover:opacity-60 transition-opacity">Explore</Link>
            <Link to="/about" className="text-gray-400 hover:opacity-60 transition-opacity">About</Link>
            <Link to="/docs" className="font-semibold text-black hover:opacity-60 transition-opacity">Docs</Link>
            <Link to="/community" className="text-gray-400 hover:opacity-60 transition-opacity">Community</Link>
            <Link to="/contact" className="text-gray-400 hover:opacity-60 transition-opacity">Contact</Link>
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-red-600"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>

          <SignedOut>
            <div className="flex items-center gap-2 md:gap-4 text-sm font-medium">
              <Link
                to="/login"
                className="hidden sm:block px-4 py-2 text-black hover:bg-gray-100 transition-colors rounded-none border-l-2 border-b-2 border-black focus:outline-none"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-none border-l-2 border-b-2 border-black transition-all focus:outline-none"
              >
                Sign up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white pt-24 px-8 md:hidden">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 right-6 text-red-600 p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <nav className="flex flex-col gap-8 text-3xl font-bold italic text-black">
            <Link to="/" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Explore</Link>
            <Link to="/about" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/docs" className="text-black hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Docs</Link>
            <Link to="/community" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <SignedOut><Link to="/login" className="text-red-600 border-t border-gray-100 pt-8" onClick={() => setIsMenuOpen(false)}>Sign in</Link></SignedOut>
          </nav>
        </div>
      )}

      <main className="flex-1 w-full relative p-4 md:p-12 overflow-hidden flex flex-col">
        <div className="mb-6 z-10 relative px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-2">Documentation</h1>
          <p className="text-gray-500 max-w-2xl text-sm md:text-base">Explore our interactive repository activity charts. Drag the annotations to inspect different data points on the timeline.</p>
        </div>

        <div className="flex-1 relative min-h-[300px] md:min-h-[400px] w-full" ref={containerRef}>
          {chartWidth > 0 && chartHeight > 0 && (
            <svg width={chartWidth} height={chartHeight} className="absolute inset-0">
              <g transform={`translate(${margin.left}, ${margin.top})`}>
                <Component
                  width={innerWidth}
                  height={innerHeight}
                  data={mockStockData}
                  xScale={xScale}
                  yScale={yScale}
                  getDate={getDate}
                  getStockValue={getStockValue}
                  AnnotationComponent={Annotation}
                  annotationPosition={annotationPosition}
                  onAnnotationPositionChange={setAnnotationPosition}
                  connectorType="elbow"
                  labelType="html"
                  subjectType="circle"
                  title="NexusVault Performance"
                  subtitle="Repository analytics tracking high activity spikes."
                  labelWidth={isMobile ? 140 : 220}
                  approxTooltipHeight={70}
                  editLabelPosition={true}
                  editSubjectPosition={true}
                  showAnchorLine={true}
                  horizontalAnchor={isMobile ? "middle" : "start"}
                  verticalAnchor="end"
                />
              </g>
            </svg>
          )}
        </div>
      </main>
    </div>
  );
};
