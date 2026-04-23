import React, { ElementType } from "react";
import { motion, useInView } from "framer-motion";

interface TimelineContentProps {
  as?: ElementType;
  animationNum?: number;
  timelineRef?: React.RefObject<Element>;
  customVariants?: any;
  className?: string;
  children?: React.ReactNode;
}

export const TimelineContent: React.FC<TimelineContentProps> = ({
  as: Component = "div",
  animationNum = 0,
  timelineRef,
  customVariants,
  className,
  children,
  ...props
}) => {
  const MotionComponent = motion(Component as any);
  const isInView = useInView(timelineRef as any, { once: true, margin: "-10%" });

  return (
    <MotionComponent
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={animationNum}
      variants={customVariants}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};
