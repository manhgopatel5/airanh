"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import { useRouter } from "next/navigation";

import type { Auth } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import type { Firestore } from "firebase/firestore";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import type { FirebaseStorage } from "firebase/storage";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import Image from "next/image";

import {
  getFirebaseAuth,
  getFirebaseStorage,
  getFirebaseDB,
} from "@/lib/firebase";

import { createTask } from "@/lib/task";

import { toast, Toaster } from "sonner";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import type { PanInfo } from "framer-motion";

import LottiePlayer from "@/components/ui/LottiePlayer";
import * as L from "@/components/illustrations";

type Visibility =
  | "public"
  | "friends"
  | "private";

type BudgetType =
  | "fixed"
  | "hourly"
  | "negotiable";

type UrgencyType =
  | "once"
  | "weekly"
  | "ongoing";

type UserType = {
  uid: string;
  email: string | null;
};

type TemplateType = {
  icon: string;
  name: string;
  cat: string;
  title: string;
  price: string;
  tags: string[];
};

type FormState = {
  title: string;
  description: string;
  price: string;
  totalSlots: number;
  startDate: string;
  endDate: string;
  category: string;
  tags: string[];
  images: string[];
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  visibility: Visibility;
  budgetType: BudgetType;
  isRemote: boolean;
  requirements: string;
  urgency: UrgencyType;
  milestones: boolean;
  autoMatch: boolean;
  allowBids: boolean;
  featured: boolean;
  privateNotes: string;
  invites: string[];
  pollPrice: boolean;
  needApproval: boolean;
  nda: boolean;
  attachments: File[];
  recurring: string;
  languages: string[];
  timezone: string;
  hours: number;
};

const parsedPrice = (value: string) =>
  Number(value.replace(/\D/g, "") || 0);

export default function CreateTaskProMax() {
  const router = useRouter();

  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const storageRef =
    useRef<FirebaseStorage | null>(null);

  const fileRef =
    useRef<HTMLInputElement>(null);

  const [user, setUser] =
    useState<UserType | null>(null);

  const [step, setStep] =
    useState<number>(1);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [imageFiles, setImageFiles] =
    useState<File[]>([]);

  const localDateTime = new Date(
    Date.now() -
      new Date().getTimezoneOffset() *
        60000
  )
    .toISOString()
    .slice(0, 16);

  const [form, setForm] =
    useState<FormState>({
      title: "",
      description: "",
      price: "",
      totalSlots: 1,
      startDate: localDateTime,
      endDate: localDateTime,
      category: "other",
      tags: [],
      images: [],
      address: "",
      city: "Hồ Chí Minh",
      lat: null,
      lng: null,
      visibility: "public",
      budgetType: "fixed",
      isRemote: true,
      requirements: "",
      urgency: "once",
      milestones: true,
      autoMatch: false,
      allowBids: false,
      featured: false,
      privateNotes: "",
      invites: [],
      pollPrice: false,
      needApproval: true,
      nda: false,
      attachments: [],
      recurring: "once",
      languages: ["Tiếng Việt"],
      timezone: "Asia/Ho_Chi_Minh",
      hours: 1,
    });

  const basePrice = useMemo(() => {
    return parsedPrice(form.price);
  }, [form.price]);

  const canNext =
    step === 1
      ? form.title.trim().length >= 10 &&
        form.description.trim().length >= 20
      : step === 2
      ? form.budgetType ===
          "negotiable" ||
        basePrice >= 10000
      : true;

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (
        typeof navigator !==
          "undefined" &&
        "vibrate" in navigator
      ) {
        navigator.vibrate(pattern);
      }
    },
    []
  );

  useEffect(() => {
    authRef.current = getFirebaseAuth();
    dbRef.current = getFirebaseDB();
    storageRef.current =
      getFirebaseStorage();

    const unsub =
      onAuthStateChanged(
        authRef.current,
        (u) => {
          if (u) {
            setUser({
              uid: u.uid,
              email: u.email,
            });
          } else {
            router.replace("/login");
          }
        }
      );

    return () => unsub();
  }, [router]);

  const handleFiles = (
    files: FileList | null
  ) => {
    if (!files) return;

    const allFiles =
      Array.from(files);

    const oversize =
      allFiles.some(
        (f) =>
          f.size >
          5 * 1024 * 1024
      );

    if (oversize) {
      toast.error(
        "Ảnh tối đa 5MB"
      );
    }

    const remaining =
      5 - form.images.length;

    const accepted = allFiles
      .slice(0, remaining)
      .filter(
        (file) =>
          file.type.startsWith(
            "image/"
          ) &&
          file.size <=
            5 * 1024 * 1024
      );

    if (accepted.length === 0) {
      toast.error(
        "Chỉ chấp nhận file ảnh"
      );
      return;
    }

    setImageFiles((prev) => [
      ...prev,
      ...accepted,
    ]);

    setForm((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        ...accepted.map((x) =>
          URL.createObjectURL(x)
        ),
      ],
    }));

    toast.success(
      `Đã thêm ${accepted.length} ảnh`
    );

    vibrate(5);
  };

  const submit = async () => {
    if (submitting) return;

    if (!user) {
      toast.error(
        "Vui lòng đăng nhập"
      );
      return;
    }

    if (
      !dbRef.current ||
      !storageRef.current
    ) {
      toast.error("Firebase lỗi");
      return;
    }

    setSubmitting(true);

    try {
      const urls =
        await Promise.all(
          imageFiles.map(
            async (file) => {
              const storagePath =
                ref(
                  storageRef.current!,
                  `tasks/${user.uid}/${Date.now()}_${file.name}`
                );

              await uploadBytes(
                storagePath,
                file
              );

              return getDownloadURL(
                storagePath
              );
            }
          )
        );

      await createTask(
        {
          title: form.title,
          description:
            form.description,
          price:
            form.budgetType ===
            "negotiable"
              ? 0
              : basePrice,
          images: urls,
          category:
            form.category,
          visibility:
            form.visibility,
          startDate:
            Timestamp.fromDate(
              new Date(
                form.startDate
              )
            ),
          deadline:
            Timestamp.fromDate(
              new Date(
                form.endDate
              )
            ),
        } as any,
        user
      );

      setSuccess(true);

      toast.success(
        "Đăng thành công"
      );

      setTimeout(() => {
        router.push("/");
      }, 1800);
    } catch (e: any) {
      toast.error(
        e?.message ||
          "Có lỗi xảy ra"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toaster richColors />

      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black">
        <div className="max-w-[680px] mx-auto p-4 space-y-4">
          <input
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                title:
                  e.target.value,
              }))
            }
            placeholder="Tiêu đề"
            className="w-full h-12 px-4 rounded-2xl border"
          />

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                description:
                  e.target.value,
              }))
            }
            placeholder="Mô tả"
            className="w-full p-4 rounded-2xl border min-h-[140px]"
          />

          <input
            type="text"
            value={form.price}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                price:
                  e.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .replace(
                      /\B(?=(\d{3})+(?!\d))/g,
                      "."
                    ),
              }))
            }
            placeholder="Ngân sách"
            className="w-full h-12 px-4 rounded-2xl border"
          />

          <input
            type="datetime-local"
            min={localDateTime}
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                startDate:
                  e.target.value,
              }))
            }
            className="w-full h-12 px-4 rounded-2xl border"
          />

          <div className="flex gap-2 overflow-x-auto">
            {form.images.map(
              (url, i) => (
                <div
                  key={i}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0"
                >
                  <Image
                    src={url}
                    alt={`Ảnh ${i + 1}`}
                    fill
                    className="object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        url.startsWith(
                          "blob:"
                        )
                      ) {
                        URL.revokeObjectURL(
                          url
                        );
                      }

                      setForm(
                        (f) => ({
                          ...f,
                          images:
                            f.images.filter(
                              (
                                _,
                                idx
                              ) =>
                                idx !==
                                i
                            ),
                        })
                      );

                      setImageFiles(
                        (prev) =>
                          prev.filter(
                            (
                              _,
                              idx
                            ) =>
                              idx !==
                              i
                          )
                      );

                      vibrate(5);
                    }}
                    className="absolute inset-0 bg-black/60 text-white"
                  >
                    X
                  </button>
                </div>
              )
            )}

            <button
              type="button"
              onClick={() =>
                fileRef.current?.click()
              }
              className="w-24 h-24 rounded-2xl border border-dashed"
            >
              +
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) =>
              handleFiles(
                e.target.files
              )
            }
          />

          <button
            type="button"
            disabled={
              !canNext ||
              submitting
            }
            onClick={submit}
            className="w-full h-12 rounded-2xl bg-[#0a84ff] text-white font-semibold"
          >
            {submitting
              ? "Đang đăng..."
              : "Đăng công việc"}
          </button>
        </div>

        <AnimatePresence>
          {submitting &&
            !success && (
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                className="fixed inset-0 bg-white dark:bg-black grid place-items-center"
              >
                <LottiePlayer
                  animationData={
                    L.loadingPull
                  }
                  loop
                  autoplay
                  className="w-24 h-24"
                />
              </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 bg-white dark:bg-black grid place-items-center"
            >
              <LottiePlayer
                animationData={
                  L.successCheck
                }
                autoplay
                className="w-32 h-32"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
