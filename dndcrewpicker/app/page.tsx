'use client';

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

  useEffect(() => {
    const fetchCrew = async () => {
      const { data, error } = await Supabase
        .from('crew')
        .select('id, Name, gold, sliver, cobber, image, is_hired');

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

    // Convert to total copper for comparison
    const walletTotal =
      gold * 10000 + silver * 100 + copper;
    const costTotal =
      costGold * 10000 + costSilver * 100 + costCopper;

    return walletTotal >= costTotal;
  };

  const handleHire = async (crew: CrewMember) => {
    if (!wallet || !canAfford(crew)) return;

    const gold = parseInt(wallet.gold);
    const silver = parseInt(wallet.Sliver);
    const copper = parseInt(wallet.cobber);

    let totalCopper = gold * 10000 + silver * 100 + copper;
    const costCopper =
      parseInt(crew.gold) * 10000 +
      parseInt(crew.sliver ?? '0') * 100 +
      parseInt(crew.cobber ?? '0');

    totalCopper -= costCopper;

    const newGold = Math.floor(totalCopper / 10000);
    const remainderAfterGold = totalCopper % 10000;
    const newSilver = Math.floor(remainderAfterGold / 100);
    const newCopper = remainderAfterGold % 100;

    // Update wallet
    const { error: walletError } = await Supabase
      .from('wallet')
      .update({
        gold: newGold.toString(),
        Sliver: newSilver.toString(),
        cobber: newCopper.toString(),
      })
      .eq('id', wallet.id);

    // Update crew member
    const { error: crewError } = await Supabase
      .from('crew')
      .update({ is_hired: true })
      .eq('id', crew.id);

    if (walletError || crewError) {
      setError(walletError || crewError);
    } else {
      // Refresh data
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

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  if (crewMembers.length === 0 || !wallet) {
    return <p>Loading data...</p>;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Wallet Display */}
        <section className={styles.walletSection}>
          <h2>Party Wallet</h2>
          <p>
            {wallet.gold} Gold, {wallet.Sliver} Silver, {wallet.cobber} Copper
          </p>
        </section>

        {/* Crew Display */}
        <section className={styles.crewSection}>
          <h2>Crew Members</h2>
          <div className={styles.crewList}>
            {crewMembers.map((crew) => (
    <div
  key={crew.id}
  className={`${styles.crewMember} ${crew.is_hired ? styles.hired : ''}`}
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
    <button
      className={styles.hireButton}
      onClick={() => handleHire(crew)}
      disabled={crew.is_hired || !canAfford(crew)}
    >
      {crew.is_hired ? 'Hired' : 'Hire'}
    </button>
  </div>
</div>

            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
