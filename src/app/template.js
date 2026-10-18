/**
 * Unlike the layout, a template is re-created on every navigation, so its
 * wrapper replays the page-enter animation each time a tab opens.
 */
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
