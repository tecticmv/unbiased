import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

// Animation variants for scroll reveal
const scrollVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Stagger container for multiple children
const staggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// Item variants for stagger children
const staggerItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Viewport settings
const defaultViewport = { once: true, margin: "-50px" };

interface ScrollRevealProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: ReactNode;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Custom viewport margin */
  margin?: string;
  /** Whether to disable the animation */
  disabled?: boolean;
}

/**
 * ScrollReveal - Animates children when they enter the viewport
 *
 * @example
 * <ScrollReveal>
 *   <Card>Content</Card>
 * </ScrollReveal>
 *
 * @example With delay
 * <ScrollReveal delay={0.2}>
 *   <Card>Delayed content</Card>
 * </ScrollReveal>
 */
export const ScrollReveal = forwardRef<HTMLDivElement, ScrollRevealProps>(
  ({ children, delay = 0, margin, disabled = false, className, ...props }, ref) => {
    if (disabled) {
      return (
        <div ref={ref} className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
          {children}
        </div>
      );
    }

    const variants = delay > 0
      ? {
          hidden: scrollVariants.hidden,
          visible: {
            ...scrollVariants.visible,
            transition: {
              ...scrollVariants.visible.transition,
              delay,
            },
          },
        }
      : scrollVariants;

    return (
      <motion.div
        ref={ref}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ ...defaultViewport, margin: margin ?? defaultViewport.margin }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

ScrollReveal.displayName = "ScrollReveal";

interface StaggerContainerProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: ReactNode;
  /** Custom stagger delay between children */
  staggerDelay?: number;
  /** Whether to disable the animation */
  disabled?: boolean;
}

/**
 * StaggerContainer - Container that staggers the animation of its children
 * Use with StaggerItem for the children
 *
 * @example
 * <StaggerContainer>
 *   <StaggerItem><Card>1</Card></StaggerItem>
 *   <StaggerItem><Card>2</Card></StaggerItem>
 *   <StaggerItem><Card>3</Card></StaggerItem>
 * </StaggerContainer>
 */
export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.1, disabled = false, className, ...props }, ref) => {
    if (disabled) {
      return (
        <div ref={ref} className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
          {children}
        </div>
      );
    }

    const variants = staggerDelay !== 0.1
      ? {
          hidden: staggerVariants.hidden,
          visible: {
            ...staggerVariants.visible,
            transition: {
              ...staggerVariants.visible.transition,
              staggerChildren: staggerDelay,
            },
          },
        }
      : staggerVariants;

    return (
      <motion.div
        ref={ref}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

StaggerContainer.displayName = "StaggerContainer";

interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: ReactNode;
}

/**
 * StaggerItem - Child item for StaggerContainer
 * Automatically inherits animation timing from parent
 */
export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={staggerItemVariants}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

StaggerItem.displayName = "StaggerItem";

// Export variants for custom implementations
export { scrollVariants, staggerVariants, staggerItemVariants, defaultViewport };
