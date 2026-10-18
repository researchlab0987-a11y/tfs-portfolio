'use client';
/**
 * Icons by name, so icons can be chosen in the editor and stored as strings.
 * Only these are bundled; add an import + entry to offer another.
 */
import {
  AlignLeft, ArrowRight, Award, BarChart3, BookOpen, Briefcase, Building2, Calendar, Check, Cpu, Download,
  ExternalLink, Facebook, FileText, FlaskConical, Github, Globe, GraduationCap, Handshake, HeartPulse, Images,
  Landmark, LayoutList, LayoutTemplate, Lightbulb, Link, Linkedin, Mail, MapPin, Mic, Newspaper, Phone, Quote,
  Radar, Rss, Sparkles, Star, Twitter, User, Users, UsersRound, Video, Wifi, Youtube, Folder,
  Home, Layers, PenLine, Microscope, Trophy, Presentation, School,
} from 'lucide-react';

export const ICONS = {
  AlignLeft, ArrowRight, Award, BarChart3, BookOpen, Briefcase, Building2, Calendar, Check, Cpu, Download,
  ExternalLink, Facebook, FileText, FlaskConical, Github, Globe, GraduationCap, Handshake, HeartPulse, Images,
  Landmark, LayoutList, LayoutTemplate, Lightbulb, Link, Linkedin, Mail, MapPin, Mic, Newspaper, Phone, Quote,
  Radar, Rss, Sparkles, Star, Twitter, User, Users, UsersRound, Video, Wifi, Youtube, Folder,
  Home, Layers, PenLine, Microscope, Trophy, Presentation, School,
};

export default function Icon({ name, fallback = null, ...props }) {
  const Cmp = ICONS[name];
  if (!Cmp) return fallback;
  return <Cmp aria-hidden="true" {...props} />;
}
