-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 10, 2024 at 04:26 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `userdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `app_users`
--

CREATE TABLE `app_users` (
  `id` int(200) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `otp` varchar(9) NOT NULL,
  `otp_expires` datetime NOT NULL DEFAULT current_timestamp(),
  `reset_token` varchar(255) NOT NULL,
  `reset_token_expires` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `app_users`
--

INSERT INTO `app_users` (`id`, `full_name`, `username`, `email`, `password`, `otp`, `otp_expires`, `reset_token`, `reset_token_expires`) VALUES
(1, 'Silas HAKUZWIMANA', 'Silus', 'hakusilas@gmail.com', '$2a$10$7NKp.gfgGBjAfR0ZlPV9buM7TkMvpx2.bKdRRp5F/LcTzdn6htkdW', '976517', '2024-10-10 02:48:41', '9bfa0a6d3b7c9b51aad8cb6f47408150014763e4', '2024-10-10 02:13:55'),
(2, 'Anne Marie MUKAZIBERA', 'Anne', 'mukaziberaanne@gmail.com', '$2a$10$FQXjlhy4FUoXv0M7h7ahx.4KnouNIrTCEtpi7PCFS1vCeufq3cOlK', '', '2024-10-10 00:59:38', '', '2024-10-10 00:58:41'),
(3, 'Sylvain IMANISHIMWE', 'Sylvain', 'hakuzwisilas@gmail.com', '$2a$10$tWPDu.b.Bjio.dSVmmQWgumtoaZUkdqLtxuv2tpaRpTgXe3tyEase', '', '2024-10-10 00:59:38', '', '2024-10-10 00:58:41'),
(4, 'Imanizibyose Florence', 'Florence', 'imanizibyose@gmail.com', '$2a$10$ttpNGLjAegZ0jWJgO4AYe./4c3g1NTm0WYJx8D4cWCY9HPJa.8vgi', '', '2024-10-10 00:59:38', '', '2024-10-10 00:58:41');

-- --------------------------------------------------------

--
-- Table structure for table `budget`
--

CREATE TABLE `budget` (
  `budget_id` int(11) NOT NULL,
  `amount` decimal(10,1) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `budget`
--

INSERT INTO `budget` (`budget_id`, `amount`, `createdAt`, `user_id`) VALUES
(5, 8000000.0, '2024-09-03 07:19:42', 3),
(6, 4000.0, '2024-09-03 08:20:54', 3),
(7, 3000.0, '2024-09-03 08:41:37', 3),
(8, 1000.0, '2024-09-03 08:42:53', 3),
(9, 1000.0, '2024-09-03 08:45:01', 3),
(10, 1000.0, '2024-09-03 08:47:42', 3),
(11, 8080000.0, '2024-09-03 08:51:32', 3),
(12, 400000.0, '2024-10-10 00:06:22', 1);

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `category`
--

INSERT INTO `category` (`category_id`, `category_name`, `createdAt`, `user_id`) VALUES
(6, 'Drama', '2024-08-31 08:27:26', 3),
(7, 'Food', '2024-08-31 08:45:12', 3),
(11, 'Weeding', '2024-08-31 09:34:10', 3),
(12, 'Fashion', '2024-08-31 09:47:46', 3),
(13, 'Clothes', '2024-09-02 14:09:54', 3),
(14, 'Entertainment ', '2024-09-03 06:24:35', 3),
(15, 'Movies', '2024-09-03 13:57:35', 3),
(16, 'Films', '2024-09-03 13:57:46', 3),
(17, 'Drama', '2024-10-10 00:07:03', 1),
(18, 'Drinks', '2024-10-10 00:07:15', 1),
(19, 'Food', '2024-10-10 00:07:21', 1),
(20, 'Clothes', '2024-10-10 00:07:29', 1),
(21, 'Entertainment ', '2024-10-10 00:07:39', 1);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_email` varchar(100) NOT NULL,
  `customer_phone` varchar(15) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `user_id`, `customer_name`, `customer_email`, `customer_phone`, `created_at`) VALUES
(1, 3, 'Silas HAKUZWIMANA', 'silashakuzwimana@gmail.com', '+250723335458', '2024-10-07 19:32:32');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `expense_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`expense_id`, `user_id`, `item_name`, `category_id`, `amount`, `date`, `description`) VALUES
(1, 3, 'Shoes', 13, 600000.00, '2024-08-28', 'To be given to needies.'),
(4, 3, 'Dress', 12, 100000.00, '2024-08-29', 'Izagurishwa kuri noheli'),
(5, 3, 'Trouser', 12, 600000.00, '2024-08-29', 'Not sold yet.'),
(6, 3, 'Hat', 12, 10000.00, '2024-09-12', 'Hat for Sunday ceremonies'),
(8, 3, 'Wedding preparation', 14, 1500000.00, '2024-09-11', 'This fund will be used to purchase all wedding requirements.'),
(9, 3, 'Shirt', 12, 10000.00, '2024-09-20', 'Tuzayambara ku cyumweru.'),
(10, 1, 'Shoes', 13, 5000.00, '2024-10-09', 'For today\'s party.'),
(11, 1, 'Birthday party ', 14, 10000.00, '2024-10-11', 'This is for celebrating my birthday.');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `creator_name` varchar(255) NOT NULL,
  `creator_email` varchar(255) NOT NULL,
  `clientName` varchar(255) NOT NULL,
  `clientEmail` varchar(255) NOT NULL,
  `invoiceDate` date NOT NULL,
  `dueDate` date NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `userId`, `creator_name`, `creator_email`, `clientName`, `clientEmail`, `invoiceDate`, `dueDate`, `description`, `amount`) VALUES
(1, 2, 'Silas HAKUZWIMANA', 'hakuzwisilas@gmail.com', 'Silas', 'hakuzwisilas@gmail.com', '2024-10-03', '2024-10-14', 'This invoice has to be paid not rather than October 14, 2024\n', 5000.00);

-- --------------------------------------------------------

--
-- Table structure for table `login_logs`
--

CREATE TABLE `login_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp` varchar(255) DEFAULT NULL,
  `login_time` datetime DEFAULT NULL,
  `logout_time` datetime DEFAULT NULL,
  `time_spent` varchar(100) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `message_time` timestamp NULL DEFAULT NULL,
  `status` enum('success','failure') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `login_logs`
--

INSERT INTO `login_logs` (`id`, `user_id`, `email`, `otp`, `login_time`, `logout_time`, `time_spent`, `message`, `message_time`, `status`, `created_at`) VALUES
(1, 2, 'hakuzwisilas@gmail.com', 'Ilx4dYTGL', '2024-10-09 22:53:46', '2024-10-09 22:54:21', '35', 'User logged out successfully.', '2024-10-09 20:53:46', 'success', '2024-10-09 20:53:46'),
(2, 1, 'hakusilas@gmail.com', 'DVsV6nO7D', '2024-10-09 23:08:46', NULL, NULL, 'Login successful! OTP sent to your email.', '2024-10-09 21:08:46', 'success', '2024-10-09 21:08:46'),
(3, 1, 'hakusilas@gmail.com', 'AZ8Ajhc1f', '2024-10-09 23:22:57', '2024-10-09 23:40:34', '1057', 'User logged out successfully.', '2024-10-09 21:22:57', 'success', '2024-10-09 21:22:57'),
(4, 1, 'hakusilas@gmail.com', 'ArmuE4Dc1', '2024-10-09 23:40:55', NULL, NULL, 'Login successful! OTP sent to your email.', '2024-10-09 21:40:55', 'success', '2024-10-09 21:40:55'),
(5, 1, 'hakusilas@gmail.com', 'slwfJihOy', '2024-10-09 23:52:09', '2024-10-10 00:07:06', '897', 'User logged out successfully.', '2024-10-09 21:52:09', 'success', '2024-10-09 21:52:09'),
(6, 1, 'hakusilas@gmail.com', 'fffoMLJiU', '2024-10-09 23:56:36', NULL, NULL, 'Login successful! OTP sent to your email.', '2024-10-09 21:56:36', 'success', '2024-10-09 21:56:36');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `itemName` varchar(255) NOT NULL,
  `pricePerItem` decimal(10,2) NOT NULL,
  `order_date` date NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `orderDescription` text NOT NULL,
  `status` enum('pending','shipped','delivered') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `customer_name`, `customer_email`, `itemName`, `pricePerItem`, `order_date`, `total_amount`, `orderDescription`, `status`) VALUES
(1, 3, 'Silas HAKUZWIMANA', 'silashakuzwimana@gmail.com', 'Shoes', 3000.00, '2024-10-02', 3000.00, 'To be sent from JMV.', 'delivered'),
(2, 3, 'Silas HAKUZWIMANA', 'silashakuzwimana@gmail.com', 'Shoes', 3000.00, '2024-10-03', 3000.00, 'To be from JMV', 'shipped'),
(4, 3, 'Silas HAKUZWIMANA', 'silashakuzwimana@gmail.com', 'Hat', 5000.00, '2024-09-30', 5000.00, 'To be sent to Danny.', 'pending'),
(5, 1, 'Silas HAKUZWIMANA', 'hakusilas@gmail.com', 'Hat', 5000.00, '2024-10-02', 5000.00, 'For me.', 'pending'),
(6, 1, 'Silas HAKUZWIMANA', 'hakusilas@gmail.com', 'Shoes', 10000.00, '2024-09-30', 10000.00, 'I want this item to be shipped not later than Tuesday June 26,2024', 'delivered'),
(8, 3, 'Silas HAKUZWIMANA', 'silashakuzwimana@gmail.com', 'Spoons', 1000.00, '2024-10-07', 50000.00, 'To be shipped and delivered today.', 'pending');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL,
  `description` text NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `user_id`, `fullName`, `email`, `name`, `category`, `price`, `stock`, `description`, `createdAt`) VALUES
(1, 2, 'Silas HAKUZWIMANA', 'hakuzwisilas@gmail.com', 'Shoes', 'Clothes', 10000.00, 20, 'For children of not greater than 5 years', '2024-10-07 19:30:00'),
(4, 2, 'Silas HAKUZWIMANA', 'hakuzwisilas@gmail.com', 'T-shirt', 'Clothes', 10000.00, 40, 'For children of not greater than 5 years', '2024-10-07 19:30:00'),
(5, 2, 'Silas HAKUZWIMANA', 'hakuzwisilas@gmail.com', 'T-shirt', 'Clothes', 2000.00, 40, 'For children of not greater than 5 years', '2024-10-07 19:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `report_generations`
--

CREATE TABLE `report_generations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `generator_name` varchar(255) NOT NULL,
  `generator_email` varchar(255) NOT NULL,
  `report_type` enum('customers','orders','invoices','inventory','all') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `file_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `report_generations`
--

INSERT INTO `report_generations` (`id`, `user_id`, `generator_name`, `generator_email`, `report_type`, `start_date`, `end_date`, `generated_at`, `file_path`) VALUES
(1, 2, '', '', 'customers', '2024-09-30', '2024-10-14', '2024-10-07 20:20:32', 'reports/customers-report.pdf'),
(2, 2, '', '', 'orders', '2024-09-30', '2024-10-14', '2024-10-07 20:27:54', 'reports/orders-report.pdf'),
(3, 2, '', '', 'invoices', '2024-09-30', '2024-10-14', '2024-10-07 20:35:55', 'reports/invoices-report.pdf'),
(4, 2, '', '', 'inventory', '2024-09-30', '2024-10-14', '2024-10-07 20:41:09', 'reports/inventory-report.pdf'),
(5, 2, '', '', 'customers', '2024-09-30', '2024-10-14', '2024-10-08 09:30:08', 'reports/customers-report.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','trader','user') DEFAULT 'user',
  `otp` varchar(9) NOT NULL,
  `otp_expires` timestamp NULL DEFAULT NULL,
  `reset_token` varchar(255) NOT NULL,
  `reset_token_expires` timestamp NULL DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `otp`, `otp_expires`, `reset_token`, `reset_token_expires`, `profile_picture`, `is_verified`, `created_at`, `updated_at`) VALUES
(1, 'Silas HAKUZWIMANA', 'hakusilas@gmail.com', '+250783647856', '$2a$10$7o7.l/I8NCrI6WD1WVYySecyT4hwwXBadQ/CuipQkF4DDtQDEigSu', 'admin', '', NULL, '', NULL, '/profiles/40ae144b020ee76d8cbe3775ae446e7f', 0, '2024-09-30 17:05:28', '2024-10-09 21:58:34'),
(2, 'Silas HAKUZWIMANA', 'hakuzwisilas@gmail.com', '+250734567634', '$2a$10$7ZbeYO2Fdg2bSiI4dtaeIuPfP75DjZTjzMXxXrBlRQLFA1d.It9KO', 'trader', '', NULL, '', NULL, '/profiles/f044941328b533063254b84f91fc5f6e', 0, '2024-09-30 17:08:41', '2024-10-09 21:59:37'),
(3, 'Silas HAKUZWIMANA', 'silashakuzwimana@gmail.com', '+250723335458', '$2a$10$ZfyqOKs7yH9TIi4uirR7DuF9So3M3GbKvEkupVSYBBVp.UR.qSyzu', 'user', '', NULL, '', NULL, '/profiles/1727892200806.jpg', 0, '2024-10-02 18:03:20', '2024-10-09 21:59:16');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `app_users`
--
ALTER TABLE `app_users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `budget`
--
ALTER TABLE `budget`
  ADD PRIMARY KEY (`budget_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `fk_user` (`user_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `login_logs`
--
ALTER TABLE `login_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `customer_name` (`customer_name`,`customer_email`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fullName` (`fullName`,`email`);

--
-- Indexes for table `report_generations`
--
ALTER TABLE `report_generations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `unique_name_email` (`name`,`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `app_users`
--
ALTER TABLE `app_users`
  MODIFY `id` int(200) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `budget`
--
ALTER TABLE `budget`
  MODIFY `budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `expense_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `login_logs`
--
ALTER TABLE `login_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `report_generations`
--
ALTER TABLE `report_generations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `budget`
--
ALTER TABLE `budget`
  ADD CONSTRAINT `budget_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`);

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`);

--
-- Constraints for table `category`
--
ALTER TABLE `category`
  ADD CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`);

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`) ON DELETE CASCADE;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`customer_name`,`customer_email`) REFERENCES `users` (`name`, `email`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`fullName`,`email`) REFERENCES `users` (`name`, `email`);

--
-- Constraints for table `report_generations`
--
ALTER TABLE `report_generations`
  ADD CONSTRAINT `report_generations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
