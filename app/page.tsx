'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Supabase from './config/supabaseClient';
import styles from './page.module.css';
import type { PostgrestError } from '@supabase/supabase-js';

type CrewMember = {
  id: number;
  Name: string;
  gold: string;
  sliver: string | null;
  cobber: string | null;
  image: string;
  is_hired: boolean;
  description: string;
  level: string;
  Class: string;
};

type Wallet = {
  id: number;
  gold: string;
  Sliver: string;
  cobber: string;
};

export default function Home() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hireSound = typeof Audio !== 'undefined' ? new Audio('/hire-sound.mp3') : null;

  useEffect(() => {
    const fetchCrew = async () => {
      const { data, error } = await Supabase
        .from('crew')
        .select('id, Name, gold, sliver, cobber, image, is_hired, description, level, Class');

      if (error) setError(error);
      else if (data) setCrewMembers(data);
    };

    const fetchWallet = async () => {
      const { data, error } = await Supabase
        .from('wallet')
        .select('id, gold, Sliver, cobber')
        .single();

      if (error) setError(error);
      else if (data) setWallet(data);
    };

    fetchCrew();
    fetchWallet();
  }, []);

  const canAfford = (crew: CrewMember): boolean => {
    if (!wallet) return false;

    const gold = parseInt(wallet.gold);
    const silver = parseInt(wallet.Sliver);
    const copper = parseInt(wallet.cobber);

    const costGold = parseInt(crew.gold);
    const costSilver = parseInt(crew.sliver ?? '0');
    const costCopper = parseInt(crew.cobber ?? '0');

    const walletTotal = gold * 10000 + silver * 100 + copper;
    const costTotal = costGold * 10000 + costSilver * 100 + costCopper;

    return walletTotal >= costTotal;
  };

  const handleHire = async (crew: CrewMember) => {
    if (!wallet || !canAfford(crew)) return;

    const gold = parseInt(wallet.gold);
    const silver = parseInt(wallet.Sliver);
    const copper = parseInt(wallet.cobber);

    let totalCopper = gold * 10000 + silver * 100 + copper;
    const costCopper = parseInt(crew.gold) * 10000 +
      parseInt(crew.sliver ?? '0') * 100 +
      parseInt(crew.cobber ?? '0');

    totalCopper -= costCopper;

    const newGold = Math.floor(totalCopper / 10000);
    const remainderAfterGold = totalCopper % 10000;
    const newSilver = Math.floor(remainderAfterGold / 100);
    const newCopper = remainderAfterGold % 100;

    const { error: walletError } = await Supabase
      .from('wallet')
      .update({
        gold: newGold.toString(),
        Sliver: newSilver.toString(),
        cobber: newCopper.toString(),
      })
      .eq('id', wallet.id);

    const { error: crewError } = await Supabase
      .from('crew')
      .update({ is_hired: true })
      .eq('id', crew.id);

    if (walletError || crewError) {
      setError(walletError || crewError);
    } else {
      hireSound?.play().catch((err) => {
        console.error('Failed to play sound:', err);
      });

      setCrewMembers((prev) =>
        prev.map((c) =>
          c.id === crew.id ? { ...c, is_hired: true } : c
        )
      );
      setWallet({
        ...wallet,
        gold: newGold.toString(),
        Sliver: newSilver.toString(),
        cobber: newCopper.toString(),
      });
    }
  };

  const handleUnhire = async (crew: CrewMember) => {
    if (!wallet) return;

    const refundCopper = parseInt(crew.gold) * 10000 +
      parseInt(crew.sliver ?? '0') * 100 +
      parseInt(crew.cobber ?? '0');

    const currentCopper = parseInt(wallet.gold) * 10000 +
      parseInt(wallet.Sliver) * 100 +
      parseInt(wallet.cobber);

    const totalCopper = currentCopper + refundCopper;

    const newGold = Math.floor(totalCopper / 10000);
    const remainderAfterGold = totalCopper % 10000;
    const newSilver = Math.floor(remainderAfterGold / 100);
    const newCopper = remainderAfterGold % 100;

    const { error: walletError } = await Supabase
      .from('wallet')
      .update({
        gold: newGold.toString(),
        Sliver: newSilver.toString(),
        cobber: newCopper.toString(),
      })
      .eq('id', wallet.id);

    const { error: crewError } = await Supabase
      .from('crew')
      .update({ is_hired: false })
      .eq('id', crew.id);

    if (walletError || crewError) {
      setError(walletError || crewError);
    } else {
      setCrewMembers((prev) =>
        prev.map((c) =>
          c.id === crew.id ? { ...c, is_hired: false } : c
        )
      );
      setWallet({
        ...wallet,
        gold: newGold.toString(),
        Sliver: newSilver.toString(),
        cobber: newCopper.toString(),
      });
    }
  };

  const openModal = (crew: CrewMember) => {
    setSelectedCrew(crew);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCrew(null);
  };

  if (error) return <p>Error loading data: {error.message}</p>;
  if (crewMembers.length === 0 || !wallet) return <p>Loading data...</p>;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.walletSection}>
          <h2>Party Wallet</h2>
          <p>
            {wallet.gold} Gold, {wallet.Sliver} Silver, {wallet.cobber} Copper
          </p>
        </section>

        <section className={styles.crewSection}>
          <h2>Crew Members</h2>
          <div className={styles.crewList}>
            {crewMembers.map((crew) => (
              <div
                key={crew.id}
                className={`${styles.crewMember} ${crew.is_hired ? styles.hired : ''}`}
                onClick={() => openModal(crew)}
                style={{ cursor: 'pointer' }}
              >
                <Image
                  src={crew.image}
                  alt={crew.Name || 'Crew Member'}
                  width={100}
                  height={100}
                  className={styles.crewImage}
                />
                <div>
                  <h3>
                    {crew.Name}
                    {crew.is_hired && <span className={styles.hiredBadge}>Hired</span>}
                  </h3>
                  <p>
                    Cost: {crew.gold} Gold, {crew.sliver ?? 0} Silver, {crew.cobber ?? 0} Copper
                  </p>
                  {crew.is_hired ? (
                    <button
                      className={styles.hireButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnhire(crew);
                      }}
                    >
                      Unhire
                    </button>
                  ) : (
                    <button
                      className={styles.hireButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHire(crew);
                      }}
                      disabled={!canAfford(crew)}
                    >
                      Hire
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modal Overlay */}
        {isModalOpen && selectedCrew && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button onClick={closeModal} className={styles.closeButton}>×</button>
              <h2>{selectedCrew.Name}</h2>
              <Image
                src={selectedCrew.image}
                alt={selectedCrew.Name}
                width={250}
                height={250}
                style={{ borderRadius: '8px', objectFit: 'cover' }}
              />
              <p>
                Cost: {selectedCrew.gold} Gold, {selectedCrew.sliver ?? 0} Silver, {selectedCrew.cobber ?? 0} Copper
              </p>
              <p>Status: {selectedCrew.is_hired ? 'Hired' : 'Available'}</p>
              <div style={{ marginTop: '1rem' }}>
                <p><strong>Description:</strong> {selectedCrew.description}</p>
                <p><strong>Class:</strong> {selectedCrew.Class}</p>
                <p><strong>Level Range:</strong> {selectedCrew.level}</p>
              </div>
              {selectedCrew.is_hired ? (
                <button
                  className={styles.hireButton}
                  onClick={() => {
                    handleUnhire(selectedCrew);
                    closeModal();
                  }}
                >
                  Unhire
                </button>
              ) : (
                <button
                  className={styles.hireButton}
                  onClick={() => {
                    handleHire(selectedCrew);
                    closeModal();
                  }}
                  disabled={!canAfford(selectedCrew)}
                >
                  Hire
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
