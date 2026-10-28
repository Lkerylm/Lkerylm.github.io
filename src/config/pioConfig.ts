import type { Live2DModelConfig, SpineModelConfig } from "../types/config";

export const spineModelConfig: SpineModelConfig = {
	enable: false,
	model: { path: "", scale: 1.0, x: 0, y: 0 },
	position: { corner: "bottom-left", offsetX: 0, offsetY: 0 },
	size: { width: 135, height: 165 },
	interactive: {
		enabled: false,
		clickAnimations: [],
		clickMessages: [],
		messageDisplayTime: 3000,
		idleAnimations: [],
		idleInterval: 8000,
	},
	responsive: { hideOnMobile: true, mobileBreakpoint: 768 },
	zIndex: 1000,
	opacity: 1.0,
};

export const live2dModelConfig: Live2DModelConfig = {
	enable: true,
	model: { path: "" },
	position: { corner: "bottom-right", offsetX: 20, offsetY: 20 },
	size: { width: 350, height: 350 },
	interactive: {
		enabled: false,
		clickMessages: [],
		messageDisplayTime: 3000,
	},
	responsive: { hideOnMobile: true, mobileBreakpoint: 768 },
};