import React, { useState } from 'react';
import { db, collection, addDoc, updateDoc, doc } from '../firebase';
import { motion } from 'motion/react';

interface RatingFormProps {
  orderId: string;
  userId: string;
  driverId: string;
  onSuccess: () => void;
}

export function RatingForm({ orderId, userId, driverId, onSuccess }: RatingFormProps) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ratingData = {
        orderId,
        userId,
        driverId,
        score,
        comment,
        createdAt: new Date().toISOString()
      };

      // 1. Add to ratings collection
      await addDoc(collection(db, 'ratings'), ratingData);

      // 2. Update order with rating info
      await updateDoc(doc(db, 'orders', orderId), {
        rating: {
          score,
          comment,
          createdAt: ratingData.createdAt
        }
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8 shadow-sm"
    >
      <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Rate Your Experience
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-yellow-700 mb-2">Rating</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setScore(star)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  star <= score ? 'text-yellow-500' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-yellow-700 mb-2">Comment (Optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about the service..."
            className="w-full p-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none bg-white"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors shadow-md disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </form>
    </motion.div>
  );
}
