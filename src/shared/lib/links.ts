import {
  IconBrandGithub,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
} from "@tabler/icons-react"

/** Shared by the header (from md up) and the help dialog (where the header hides them). */
export const LINKS = [
  { label: "TikTok", href: "https://www.tiktok.com/@semyelite", Icon: IconBrandTiktok },
  { label: "Instagram", href: "https://www.instagram.com/omo.its.semy", Icon: IconBrandInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/olaleyefisayo/", Icon: IconBrandLinkedin },
  { label: "GitHub", href: "https://github.com/OlaleyeFisayo", Icon: IconBrandGithub },
  { label: "X", href: "https://x.com/semyelite", Icon: IconBrandX },
]

// ponytail: IconButton renders a <button>, so the links borrow its classes rather than
// making it polymorphic for five anchors
export const linkClass =
  "inline-flex size-9 items-center justify-center rounded-sm border border-transparent text-ash transition-colors duration-100 hover:border-rule hover:text-paper focus-visible:outline-2 focus-visible:outline-contrast focus-visible:outline-offset-2 md:size-8"
