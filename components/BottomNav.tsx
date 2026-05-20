                      animate={{
                        rotate: isOpen? 135 : 0,
                        scale: isOpen? 0.88 : 1
                      }}
                      whileHover={{ scale: isOpen? 0.88 : 1.08 }}
                      whileTap={{ scale: 0.85 }}
                      transition={SPRING_BOUNCY}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${dynamicGlow} relative overflow-hidden ${
   isOpen 
                      ? "bg-zinc-900 dark:bg-zinc-800 shadow-zinc-950/20" 
                          : `${activeBgClass} shadow-lg`
                      }`}
                    >
<motion.div
  className="absolute inset-0 bg-gradient-to-tr from-white/40 via-white/10 to-transparent"
  animate={{
    rotate: [0, 360]
  }}
  transition={{
    duration: 8,
    repeat: Infinity,
    ease: "linear"
  }}
/>
                      <Plus className="w-6 h-6" strokeWidth={3.5} />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />
                    </motion.div>
                  </motion.button>
                </div>

                <div className="flex-1 grid grid-cols-2 h-full">
                  {rightItems.map((item) => (
                    <MagneticNavItem
                      key={item.path}
                      item={item}
                      active={checkActive(item.path)}
                      onClick={() => handleNavigation(item.path)}
                      activeColorClass={activeColorClass}
                      activeBgClass={activeBgClass}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>,
    document.body
  );
}
