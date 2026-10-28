import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { LinkPreset, type NavBarLink } from "@/types/config";

export const LinkPresets: { [key in LinkPreset]: NavBarLink } = {
	[LinkPreset.Home]: {
		name: i18n(I18nKey.home),
		url: "/",
		icon: "mingcute:home-5-fill",
	},
	[LinkPreset.About]: {
		name: i18n(I18nKey.about),
		url: "/about/",
		icon: "mingcute:flower-2-fill",
	},
	[LinkPreset.Archive]: {
		name: i18n(I18nKey.archive),
		url: "/archive/",
		icon: "mingcute:time-fill",
	},
	[LinkPreset.Friends]: {
		name: i18n(I18nKey.friends),
		url: "/friends/",
		icon: "mingcute:group-2-fill",
	},
	[LinkPreset.Sponsor]: {
		name: i18n(I18nKey.sponsor),
		url: "/sponsor/",
		icon: "mingcute:heart-fill",
	},
	[LinkPreset.Guestbook]: {
		name: i18n(I18nKey.guestbook),
		url: "/guestbook/",
		icon: "mingcute:chat-3-fill",
	},
	[LinkPreset.Bangumi]: {
		name: i18n(I18nKey.bangumi),
		url: "/bangumi/",
		icon: "mingcute:play-circle-fill",
	},
	[LinkPreset.Gallery]: {
		name: i18n(I18nKey.gallery),
		url: "/gallery/",
		icon: "mingcute:pic-fill",
	},
};
